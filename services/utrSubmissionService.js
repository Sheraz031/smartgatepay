import transactionModel from '../models/transactionModel.js';
import orderModel from '../models/orderModel.js';
import paymentGatewayModel from '../models/paymentGatewayModel.js';
import Logger from '../utils/logger.js';
import { fetchGatewayTransactions } from '../utils/gatewayTransactionFetcher.js';
import GATEWAY_TYPES from '../enums/gatewayTypes.js';

/**
 * Validate UTR number format
 * @param {string} utrNumber - UTR number to validate
 * @returns {Object} Validation result with success and message
 */
const validateUTRNumber = (utrNumber) => {
  if (!utrNumber || !utrNumber.trim()) {
    return { success: false, message: 'UTR number is required' };
  }

  if (utrNumber.length !== 12) {
    return { success: false, message: 'UTR number must be exactly 12 digits' };
  }

  return { success: true };
};

/**
 * Find order and populate gateway details
 * @param {string} orderId - Order ID to find
 * @returns {Object} Order object with populated gateway
 */
const findOrderWithGateway = async (orderId) => {
  const order = await orderModel.findOne({ orderId }).populate('createdFor');

  if (!order) {
    throw new Error('Order not found');
  }

  const gateway = await paymentGatewayModel.findById(order.createdFor);

  if (!gateway) {
    throw new Error('Gateway not found');
  }

  return { order, gateway };
};

/**
 * Check if UTR already exists in database
 * @param {string} utrNumber - UTR number to check
 * @returns {boolean} True if UTR already exists
 */
const checkUTRExists = async (utrNumber) => {
  const existingUTRTransaction = await transactionModel.findOne({ utrNumber: utrNumber.trim() });
  return !!existingUTRTransaction;
};

/**
 * Find matching transaction in gateway response
 * @param {Array} gatewayTransactions - Array of gateway transactions
 * @param {string} utrNumber - UTR number to match
 * @param {string} gatewayType - Type of gateway
 * @returns {Object|null} Matched transaction or null
 */
const findMatchingTransaction = (gatewayTransactions, utrNumber, gatewayType) => {
  return gatewayTransactions.find((transaction) => {
    switch (gatewayType) {
      case GATEWAY_TYPES.RAZORPAY:
        return transaction.acquirer_data?.rrn === utrNumber.trim();
      case GATEWAY_TYPES.PAYTM:
        return (
          transaction.UTR === utrNumber.trim() ||
          transaction.utr === utrNumber.trim() ||
          transaction.utrNumber === utrNumber.trim()
        );
      case GATEWAY_TYPES.BHARATPE:
        return (
          transaction.utr === utrNumber.trim() ||
          transaction.UTR === utrNumber.trim() ||
          transaction.utrNumber === utrNumber.trim()
        );
      default:
        return false;
    }
  });
};

/**
 * Determine transaction status based on gateway type and transaction data
 * @param {string} gatewayType - Type of gateway
 * @param {Object} matchedTransaction - Matched gateway transaction
 * @returns {string} Transaction status
 */
const determineTransactionStatus = (gatewayType, matchedTransaction) => {
  if (gatewayType === GATEWAY_TYPES.RAZORPAY) {
    return matchedTransaction.captured ? 'success' : 'failed';
  }
  return matchedTransaction.status || 'success';
};

/**
 * Calculate transaction amount based on gateway type
 * @param {string} gatewayType - Type of gateway
 * @param {number} amount - Amount from gateway transaction
 * @returns {number} Calculated amount
 */
const calculateTransactionAmount = (gatewayType, amount) => {
  if (gatewayType === GATEWAY_TYPES.RAZORPAY) {
    return amount / 100; // Convert from paise to rupees for Razorpay
  }
  return amount; // Use as-is for other gateways
};

/**
 * Create transaction data object
 * @param {Object} matchedTransaction - Matched gateway transaction
 * @param {Object} order - Order object
 * @param {Object} gateway - Gateway object
 * @param {string} utrNumber - UTR number
 * @returns {Object} Transaction data object
 */
const createTransactionData = (matchedTransaction, order, gateway, utrNumber) => {
  return {
    transactionId: matchedTransaction.id,
    amount: calculateTransactionAmount(gateway.type, matchedTransaction.amount),
    gateway: order.createdFor,
    customerEmail: order.customerEmail,
    status: determineTransactionStatus(gateway.type, matchedTransaction),
    utrNumber: utrNumber.trim(),
    createdBy: gateway.createdBy || null,
    gatewayTransactionData: matchedTransaction,
    paymentMethod: 'UPI',
  };
};

/**
 * Main UTR submission service
 * @param {string} utrNumber - UTR number to submit
 * @param {string} orderId - Order ID
 * @returns {Object} Result with success status and data/error
 */
export const submitUTR = async (utrNumber, orderId) => {
  try {
    Logger.info('Starting UTR submission process', { utrNumber, orderId });

    const utrValidation = validateUTRNumber(utrNumber);
    if (!utrValidation.success) {
      return { success: false, message: utrValidation.message };
    }

    if (!orderId) {
      return { success: false, message: 'Order ID is required' };
    }

    const { order, gateway } = await findOrderWithGateway(orderId);

    const utrExists = await checkUTRExists(utrNumber);
    if (utrExists) {
      return {
        success: false,
        message:
          'UTR number already exists. Please verify the UTR number or contact support if this is an error.',
      };
    }

    Logger.info('Fetching transactions from gateway for UTR verification', {
      gatewayType: gateway.type,
      orderId,
    });

    const gatewayTransactions = await fetchGatewayTransactions(gateway, order);

    if (gatewayTransactions.length === 0) {
      Logger.warn('No transactions found from gateway', {
        gatewayType: gateway.type,
        orderId,
      });
      return {
        success: false,
        message: 'No transactions found from gateway. Please try again later.',
      };
    }

    // Find matching transaction
    const matchedTransaction = findMatchingTransaction(
      gatewayTransactions,
      utrNumber,
      gateway.type
    );

    if (!matchedTransaction) {
      Logger.warn('Transaction with provided UTR not found in gateway transactions', {
        utrNumber: utrNumber.trim(),
        gatewayType: gateway.type,
        orderId,
      });
      return {
        success: false,
        message:
          'Transaction with provided UTR number not found in gateway transactions. Please verify the UTR number.',
      };
    }

    Logger.info('UTR verified successfully with gateway', {
      utrNumber: utrNumber.trim(),
      gatewayType: gateway.type,
      orderId,
      gatewayTransactionId: matchedTransaction.id || matchedTransaction.payment_id,
    });

    // Create transaction data
    const transactionData = createTransactionData(matchedTransaction, order, gateway, utrNumber);

    // Create transaction in database
    const newTransaction = await transactionModel.create(transactionData);

    Logger.success('UTR submitted successfully', {
      orderId,
      utrNumber: utrNumber.trim(),
      transactionId: newTransaction._id,
    });

    return {
      success: true,
      message: 'UTR submitted successfully',
    };
  } catch (error) {
    Logger.error('Error in UTR submission service', {
      error: error.message,
      stack: error.stack,
      utrNumber,
      orderId,
    });

    return {
      success: false,
      message: error.message || 'Failed to submit UTR',
    };
  }
};
