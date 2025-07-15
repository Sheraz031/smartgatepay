import paymentGatewayModel from '../models/paymentGatewayModel.js';
import Logger from '../utils/logger.js';
import verifyGatewayUtil from '../services/gatewayVerificationService.js';

export const createPaymentGateway = async (req, res) => {
  try {
    const {
      gatewayName,
      type,
      company,
      status,
      apiKey,
      upiId,
      merchantId,
      webhookUrl,
      priority,
      dailyLimit,
      monthlyLimit,
      userId,
    } = req.body;

    Logger.info('Creating new payment gateway', {
      gatewayName,
      company,
      status,
    });

    if (!gatewayName || !company || !apiKey || !merchantId || !upiId || !type) {
      Logger.warn('Missing required fields for gateway creation');
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing',
      });
    }

    const newGateway = await paymentGatewayModel.create({
      name: gatewayName,
      type,
      company,
      status,
      apiKey,
      upiId,
      merchantId,
      webhookUrl,
      priority,
      dailyLimit,
      monthlyLimit,
      createdBy: userId,
    });

    const gateway = await paymentGatewayModel.findById(newGateway._id).populate('company');

    Logger.success('Payment gateway created successfully', {
      id: newGateway._id,
      gatewayName,
    });

    res.status(201).json({
      success: true,
      message: 'Payment gateway created successfully',
      gateway,
    });
  } catch (error) {
    Logger.error('Error creating payment gateway', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllPaymentGateways = async (req, res) => {
  try {
    const { userId, role } = req.body;
    Logger.info('Fetching all payment gateways', { userId, role });

    const filter = role === 'admin' ? {} : { createdBy: userId };

    const gateways = await paymentGatewayModel
      .find(filter)
      .populate('company')
      .sort({ createdAt: -1 });

    Logger.success('Payment gateways retrieved successfully');
    res.status(200).json({ success: true, gateways });
  } catch (error) {
    Logger.error('Error fetching payment gateways', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPaymentGatewayById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    Logger.info('Fetching payment gateway by ID', { id });

    const filter = role === 'admin' ? { _id: id } : { _id: id, createdBy: userId };

    const gateway = await paymentGatewayModel.findOne(filter).populate('company');

    if (!gateway) {
      Logger.warn('Payment gateway not found or unauthorized', { id });
      return res.json({
        success: false,
        message: 'Payment gateway not found or unauthorized',
      });
    }

    Logger.success('Payment gateway retrieved successfully', { id });
    res.status(200).json({ success: true, gateway });
  } catch (error) {
    Logger.error('Error fetching payment gateway', {
      error: error.message,
      id: req.params.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePaymentGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    Logger.info('Updating payment gateway', { id });

    const filter = role === 'admin' ? { _id: id } : { _id: id, createdBy: userId };

    const updatedGateway = await paymentGatewayModel
      .findOneAndUpdate(filter, req.body, { new: true })
      .populate('company');

    if (!updatedGateway) {
      Logger.warn('Payment gateway not found or unauthorized', { id });
      return res.json({
        success: false,
        message: 'Payment gateway not found or unauthorized',
      });
    }

    Logger.success('Payment gateway updated successfully', { id });
    res.status(200).json({ success: true, gateway: updatedGateway });
  } catch (error) {
    Logger.error('Error updating payment gateway', {
      error: error.message,
      id: req.params.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePaymentGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    Logger.info('Deleting payment gateway', { id });

    const filter = role === 'admin' ? { _id: id } : { _id: id, createdBy: userId };

    const deletedGateway = await paymentGatewayModel.findOneAndDelete(filter);

    if (!deletedGateway) {
      Logger.warn('Payment gateway not found or unauthorized', { id });
      return res.json({
        success: false,
        message: 'Payment gateway not found or unauthorized',
      });
    }

    Logger.success('Payment gateway deleted successfully', { id });
    res.status(200).json({
      success: true,
      message: 'Payment gateway deleted successfully',
    });
  } catch (error) {
    Logger.error('Error deleting payment gateway', {
      error: error.message,
      id: req.params.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyPaymentGateway = async (req, res, next) => {
  try {
    const {
      paymentGatewayID,
      cookie,
      apiToken,
      apiSecret,
      transactionRef,
      accesskeyId,
      merchantKey,
      xsrf,
    } = req.body;
    if (!paymentGatewayID) {
      return res.status(400).json({ error: 'paymentGatewayID is required' });
    }
    const gateway = await paymentGatewayModel.findById(paymentGatewayID);
    if (!gateway) {
      return res.status(404).json({ error: 'Payment gateway not found' });
    }
    // Update apiDetails
    gateway.apiDetails = {
      ...gateway.apiDetails,
      apiToken,
      apiSecret,
      tr: transactionRef,
      accesskeyId,
      merchantKey,
      cookie,
      xsrf,
    };
    await gateway.save();

    const result = await verifyGatewayUtil(gateway);
    if (result.status === 'inactive') {
      return res.status(401).json({
        id: gateway._id,
        status: gateway.status,
        message: 'The provided gateway is not verified!',
      });
    }
    gateway.status = result.status;
    await gateway.save();
    return res.status(200).json({ id: gateway._id, status: gateway.status });
  } catch (err) {
    next(err);
  }
};
