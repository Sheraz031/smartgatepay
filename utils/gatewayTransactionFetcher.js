import axios from 'axios';
import Razorpay from 'razorpay';
import Logger from './logger.js';
import GATEWAY_TYPES from '../enums/gatewayTypes.js';

/**
 * Fetch transactions from Razorpay API
 * @param {Object} gateway - Gateway configuration with API details
 * @param {Object} order - Order details
 * @returns {Promise<Array>} Array of transactions
 */
const fetchRazorpayTransactions = async (gateway, order) => {
  try {
    const { apiSecret } = gateway.apiDetails;

    if (!apiSecret || !apiSecret.includes(',')) {
      throw new Error('Razorpay API secret is required and must be in format: key_id,key_secret');
    }

    const [key_id, key_secret] = apiSecret.split(',');

    if (!key_id || !key_secret) {
      throw new Error('Invalid Razorpay API secret format. Expected: key_id,key_secret');
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    // Calculate date range (last 3 hours) - Unix timestamps in seconds
    const now = Math.floor(Date.now() / 1000);
    const from = now - 3 * 60 * 60;
    const to = now;

    Logger.info('Fetching Razorpay payments with date range', {
      from: new Date(from * 1000).toISOString(),
      to: new Date(to * 1000).toISOString(),
      fromTimestamp: from,
      toTimestamp: to,
      orderId: order.orderId,
    });

    // Fetch payments using Razorpay SDK
    const response = await razorpay.payments.all({
      from,
      to,
      count: 100,
      skip: 0,
    });

    Logger.info('Razorpay transactions fetched successfully', {
      count: response.items?.length || 0,
      orderId: order.orderId,
    });

    return response.items || [];
  } catch (error) {
    Logger.error('Error fetching Razorpay transactions', {
      error: error.message,
      orderId: order.orderId,
    });
    throw new Error(`Failed to fetch Razorpay transactions: ${error.message}`);
  }
};

/**
 * Fetch transactions from Paytm API
 * @param {Object} gateway - Gateway configuration with API details
 * @param {Object} order - Order details
 * @returns {Promise<Array>} Array of transactions
 */
const fetchPaytmTransactions = async (gateway, order) => {
  try {
    const { apiToken, apiSecret } = gateway.apiDetails;

    if (!apiToken || !apiSecret) {
      throw new Error('Paytm API token and secret are required');
    }

    // Calculate date range (last 24 hours)
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const response = await axios.get('https://securegw.paytm.in/v3/order/status', {
      params: {
        MID: gateway.merchantId,
        ORDERID: order.orderId,
        CHECKSUMHASH: apiSecret, // This might need proper checksum generation
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });

    Logger.info('Paytm transactions fetched successfully', {
      orderId: order.orderId,
    });

    return [response.data] || [];
  } catch (error) {
    Logger.error('Error fetching Paytm transactions', {
      error: error.message,
      orderId: order.orderId,
    });
    throw new Error(`Failed to fetch Paytm transactions: ${error.message}`);
  }
};

/**
 * Fetch transactions from BharatPe API
 * @param {Object} gateway - Gateway configuration with API details
 * @param {Object} order - Order details
 * @returns {Promise<Array>} Array of transactions
 */
const fetchBharatPeTransactions = async (gateway, order) => {
  try {
    const { apiToken, apiSecret } = gateway.apiDetails;

    if (!apiToken || !apiSecret) {
      throw new Error('BharatPe API token and secret are required');
    }

    // Calculate date range (last 24 hours)
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const response = await axios.get('https://api.bharatpe.com/transaction/v1/status', {
      params: {
        merchantId: gateway.merchantId,
        orderId: order.orderId,
      },
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    Logger.info('BharatPe transactions fetched successfully', {
      orderId: order.orderId,
    });

    return [response.data] || [];
  } catch (error) {
    Logger.error('Error fetching BharatPe transactions', {
      error: error.message,
      orderId: order.orderId,
    });
    throw new Error(`Failed to fetch BharatPe transactions: ${error.message}`);
  }
};

/**
 * Main function to fetch transactions based on gateway type
 * @param {Object} gateway - Gateway configuration
 * @param {Object} order - Order details
 * @returns {Promise<Array>} Array of transactions from the gateway
 */
export const fetchGatewayTransactions = async (gateway, order) => {
  try {
    Logger.info('Fetching transactions from gateway', {
      gatewayType: gateway.type,
      orderId: order.orderId,
    });

    switch (gateway.type) {
      case GATEWAY_TYPES.RAZORPAY:
        return await fetchRazorpayTransactions(gateway, order);

      case GATEWAY_TYPES.PAYTM:
        return await fetchPaytmTransactions(gateway, order);

      case GATEWAY_TYPES.BHARATPE:
        return await fetchBharatPeTransactions(gateway, order);

      default:
        throw new Error(`Unsupported gateway type: ${gateway.type}`);
    }
  } catch (error) {
    Logger.error('Error in fetchGatewayTransactions', {
      error: error.message,
      gatewayType: gateway.type,
      orderId: order.orderId,
    });
    throw error;
  }
};

/**
 * Verify UTR number against gateway transactions
 * @param {string} utrNumber - UTR number to verify
 * @param {Array} transactions - Array of transactions from gateway
 * @param {string} gatewayType - Type of gateway
 * @returns {boolean} True if UTR is found and valid
 */
export const verifyUTRWithGateway = (utrNumber, transactions, gatewayType) => {
  try {
    Logger.info('Verifying UTR with gateway transactions', {
      utrNumber,
      gatewayType,
      transactionCount: transactions.length,
    });

    switch (gatewayType) {
      case GATEWAY_TYPES.RAZORPAY:
        // For Razorpay, check if UTR exists in acquirer_data.rrn
        return transactions.some((transaction) => transaction.acquirer_data?.rrn === utrNumber);

      case GATEWAY_TYPES.PAYTM:
        // For Paytm, check UTR in transaction details
        return transactions.some(
          (transaction) =>
            transaction.UTR === utrNumber ||
            transaction.utr === utrNumber ||
            transaction.utrNumber === utrNumber
        );

      case GATEWAY_TYPES.BHARATPE:
        // For BharatPe, check UTR in transaction details
        return transactions.some(
          (transaction) =>
            transaction.utr === utrNumber ||
            transaction.UTR === utrNumber ||
            transaction.utrNumber === utrNumber
        );

      default:
        Logger.warn('Unknown gateway type for UTR verification', { gatewayType });
        return false;
    }
  } catch (error) {
    Logger.error('Error verifying UTR with gateway', {
      error: error.message,
      utrNumber,
      gatewayType,
    });
    return false;
  }
};
