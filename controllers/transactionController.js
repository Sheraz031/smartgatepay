import transactionModel from '../models/transactionModel.js';
import Logger from '../utils/logger.js';
import { startOfDay, startOfMonth } from 'date-fns';
import { submitUTR } from '../services/utrSubmissionService.js';

export const createTransaction = async (req, res) => {
  try {
    const { amount, gateway, customerEmail, status, userId } = req.body;

    Logger.info('Creating new transaction', {
      amount,
      gateway,
    });

    if (!amount || !gateway || !customerEmail) {
      Logger.warn('Missing required fields for transaction creation');
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing',
      });
    }

    const newTransaction = await transactionModel.create({
      amount,
      gateway,
      customerEmail,
      status,
      createdBy: userId,
    });

    Logger.success('Transaction created successfully', {
      id: newTransaction._id,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: newTransaction,
    });
  } catch (error) {
    Logger.error('Error creating transaction', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const { userId, role } = req.body;
    Logger.info('Fetching all transactions', { userId, role });
    const filter = role === 'admin' ? {} : { createdBy: userId };
    const now = new Date();
    const startOfToday = startOfDay(now);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfThisMonth = startOfMonth(now);

    const transactions = await transactionModel
      .find(filter)
      .select('-gatewayTransactionData')
      .populate({
        path: 'gateway',
        select: 'name company',
        populate: {
          path: 'company',
          select: 'name',
        },
      })
      .sort({ createdAt: -1 });

    const [todayStats, monthStats, totalStats] = await Promise.all([
      // ✅ Today's amount
      transactionModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),

      // ✅ This month's amount
      transactionModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfThisMonth, $lte: now },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),

      // ✅ Total transaction count
      transactionModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    Logger.success('Transactions and summary fetched successfully');

    res.status(200).json({
      success: true,
      transactions,
      summary: {
        todayAmount: Math.round((todayStats[0]?.total || 0) * 100) / 100,
        thisMonthAmount: Math.round((monthStats[0]?.total || 0) * 100) / 100,
        totalTransactions: Math.round((totalStats[0]?.total || 0) * 100) / 100,
      },
    });
  } catch (error) {
    Logger.error('Error fetching transactions', {
      error: error.message,
      stack: error.stack,
    });

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = (await import('mongoose')).default;

    Logger.info('Fetching transaction by ID', { id });

    let filter;
    if (mongoose.Types.ObjectId.isValid(id)) {
      filter = { _id: id };
    } else {
      filter = { transactionId: id };
    }

    // const transaction = await transactionModel.findOne(filter).populate({
    //   path: 'gateway',
    //   select: 'name company',
    //   populate: {
    //     path: 'company',
    //     select: 'name',
    //   },
    // });

    let transaction = await transactionModel.findOne(filter);
    if (transaction && transaction.gatewayTransactionData !== undefined) {
      transaction = transaction.toObject();
      delete transaction.gatewayTransactionData;
    }

    if (!transaction) {
      Logger.warn('Transaction not found', { id });
      return res.json({
        success: false,
        message: 'Transaction not found',
      });
    }

    Logger.success('Transaction retrieved successfully', { id });
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    Logger.error('Error fetching transaction', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    Logger.info('Updating transaction', { id });

    const filter = role === 'admin' ? { _id: id } : { _id: id, createdBy: userId };

    const updatedTransaction = await transactionModel
      .findOneAndUpdate(filter, req.body, {
        new: true,
      })
      .populate({
        path: 'gateway',
        select: 'name company',
        populate: {
          path: 'company',
          select: 'name',
        },
      });

    if (!updatedTransaction) {
      Logger.warn('Transaction not found or unauthorized', { id });
      return res.json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    Logger.success('Transaction updated successfully', { id });
    res.status(200).json({ success: true, transaction: updatedTransaction });
  } catch (error) {
    Logger.error('Error updating transaction', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    Logger.info('Deleting transaction', { id });

    const filter = role === 'admin' ? { _id: id } : { _id: id, createdBy: userId };

    // const deletedTransaction = await transactionModel.findOneAndDelete(filter);
    const deletedTransaction = await transactionModel.deleteMany({});

    if (!deletedTransaction) {
      Logger.warn('Transaction not found or unauthorized', { id });
      return res.json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    Logger.success('Transaction deleted successfully', { id });
    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    Logger.error('Error deleting transaction', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const filterTransactions = async (req, res) => {
  try {
    const { dateFrom, dateTo, status, paymentGateway, company, search } = req.query;
    const { userId, role } = req.body;

    Logger.info('Filtering transactions', {
      dateFrom,
      dateTo,
      status,
      paymentGateway,
      company,
      search,
    });

    let filter = {};

    if (dateFrom || dateTo) {
      const parsedDateFrom = dateFrom ? new Date(dateFrom) : null;
      const parsedDateTo = dateTo ? new Date(dateTo) : null;

      if (dateFrom && isNaN(parsedDateFrom)) {
        throw new Error('Invalid dateFrom format');
      }
      if (dateTo && isNaN(parsedDateTo)) {
        throw new Error('Invalid dateTo format');
      }

      if (parsedDateTo) {
        parsedDateTo.setHours(23, 59, 59, 999); // End of the day
      }

      filter.createdAt = {};
      if (parsedDateFrom) filter.createdAt.$gte = parsedDateFrom;
      if (parsedDateTo) filter.createdAt.$lte = parsedDateTo;
    }

    if (status) {
      filter.status = status;
    }

    if (paymentGateway) {
      filter.gateway = paymentGateway;
    }

    if (company) {
      filter.gateway = { $in: await mongoose.model('PaymentGateway').distinct('_id', { company }) };
    }

    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (role !== 'admin') {
      filter.createdBy = userId;
    }

    const transactions = await transactionModel
      .find(filter)
      .populate({
        path: 'gateway',
        select: 'name company',
        populate: { path: 'company', select: 'name' },
      })
      .sort({ createdAt: -1 });

    Logger.success('Transactions filtered successfully');
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    Logger.error('Error filtering transactions', { error: error.message, stack: error.stack });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitTransactionUTR = async (req, res) => {
  try {
    const { utrNumber, orderId } = req.body;

    Logger.info('Submitting UTR for transaction', { utrNumber, orderId });

    const result = await submitUTR(utrNumber, orderId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      const statusCode = result.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    Logger.error('Error submitting UTR', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to submit UTR',
    });
  }
};
