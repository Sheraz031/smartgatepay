import orderModel from '../models/orderModel.js';
import Logger from '../utils/logger.js';
import { generateUPIQRCode } from '../services/qrCodeGenerationService.js';
import paymentGatewayModel from '../models/paymentGatewayModel.js';
import { randomUUID } from 'crypto';

export const createOrder = async (req, res) => {
  try {
    Logger.info('Incoming order creation request', {
      body: req.body,
      contentType: req.headers['content-type'],
      userId: req.body.userId,
      bodyKeys: Object.keys(req.body),
    });

    const {
      customerName,
      customerEmail,
      customerMobile,
      redirectUrl,
      amount,
      udf1,
      udf2,
      udf3,
      gateway,
    } = req.body;

    if (!redirectUrl || !amount || !gateway) {
      Logger.warn('Missing required fields for order creation');
      return res.status(400).json({
        success: false,
        message: 'redirectUrl, amount, and userId are required fields',
      });
    }

    if (amount < 1) {
      Logger.warn('Invalid amount');
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const urlRegex = /^(https?):\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,6}(\S*)$/;
    if (!urlRegex.test(redirectUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid redirect URL' });
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    if (customerMobile && !/^(\+?\d{1,4}[\s-]?)?\d{7,15}$/.test(customerMobile)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    let gatewayDoc;
    if (gateway) {
      gatewayDoc = await paymentGatewayModel.findById(gateway).lean();
      if (!gatewayDoc) {
        return res.status(400).json({ success: false, message: 'Invalid payment gateway' });
      }
    }

    // if (gatewayDoc.type === GATEWAY_TYPES.RAZORPAY) {
    //   const apiAndSecret = gatewayDoc.apiDetails?.apiSecret;
    //   if (!apiAndSecret || !apiAndSecret.includes(',')) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: 'Missing or invalid Razorpay API Secret' });
    //   }
    //   const [key_id, key_secret] = apiAndSecret.split(',').map((s) => s.trim());
    //   const authString = Buffer.from(`${key_id}:${key_secret}`).toString('base64');
    //   const amountInPaise = Math.round(Number(amount) * 100);
    //   try {
    //     const orderPayload = {
    //       amount: amountInPaise,
    //       currency: 'INR',
    //       receipt: `rcpt_${Date.now()}`,
    //       notes: {
    //         Origin: 'Via Supra pay manager',
    //         customerName: customerName,
    //         customerEmail: customerEmail,
    //         customerMobile: customerMobile,
    //       },
    //     };

    //     Logger.info('Creating Razorpay order with axios:', {
    //       amountInPaise,
    //       key_id,
    //     });

    //     if (!process.env.RAZORPAY_BASE_URL) {
    //       Logger.error(
    //         'RAZORPAY_BASE_URL environment variable is required for Razorpay integration.'
    //       );
    //       return res.status(400).json({
    //         success: false,
    //         message: 'RAZORPAY_BASE_URL environment variable is required for Razorpay integration.',
    //       });
    //     }
    //     const razorpayOrderResponse = await axios.post(
    //       `${process.env.RAZORPAY_BASE_URL}/v1/orders`,
    //       orderPayload,
    //       {
    //         headers: {
    //           Authorization: `Basic ${authString}`,
    //           'Content-Type': 'application/json',
    //         },
    //       }
    //     );
    //     const razorpayOrder = razorpayOrderResponse.data;
    //     req.body.razorpayOrderId = razorpayOrder.id;
    //     req.body.razorpayOrderStatus = razorpayOrder.status;
    //   } catch (err) {
    //     Logger.error('Razorpay Order Creation Error', {
    //       message: err.message,
    //       name: err.name,
    //       statusCode: err.statusCode,
    //       error: err.error,
    //       stack: err.stack,
    //       raw: err, // full object
    //     });

    //     return res.status(400).json({
    //       success: false,
    //       message: 'Failed to create Razorpay order',
    //       details: err?.error?.description || err.message || 'Unknown error',
    //     });
    //   }
    // }

    let newOrder;
    try {
      newOrder = await orderModel.create({
        orderId: req.body.razorpayOrderId || randomUUID(),
        status: req.body.razorpayOrderStatus || 'created',
        customerName,
        customerEmail,
        customerPhone: customerMobile,
        redirectUrl,
        amount,
        udf1,
        udf2,
        udf3,
        createdFor: gatewayDoc._id,
      });

      const qrCodeDataUrl = await generateUPIQRCode(newOrder, gateway);

      await orderModel.findByIdAndUpdate(newOrder._id, {
        qrCodeData: qrCodeDataUrl,
      });

      Logger.success('Order created successfully', {
        orderId: newOrder.orderId,
        id: newOrder._id,
      });

      res.status(201).json({
        status: true,
        message: 'Order Created Successfully',
        result: {
          orderId: newOrder.orderId,
          payment_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment?orderId=${newOrder.orderId}`,
        },
      });
    } catch (qrError) {
      if (newOrder) {
        try {
          await orderModel.findByIdAndDelete(newOrder._id);
          Logger.warn('Order deleted due to QR code generation failure', {
            orderId: newOrder.orderId,
            error: qrError.message,
          });
        } catch (deleteError) {
          Logger.error('Failed to delete order after QR failure', {
            orderId: newOrder.orderId,
            deleteError: deleteError.message,
            qrError: qrError.message,
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to generate payment QR code',
        error: qrError?.message || 'Unknown error during QR code generation',
      });
    }
  } catch (error) {
    Logger.error('Error creating order', {
      error: error.message,
      stack: error.stack,
    });

    if (error.code === 11000 && error.keyPattern?.orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID already exists. Please try again.',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const getOrderQRData = async (req, res) => {
  try {
    const { orderId } = req.params;

    Logger.info('Fetching QR data for order', { orderId });

    const order = await orderModel.findOne({ orderId });

    if (!order) {
      Logger.warn('Order not found for QR data', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.qrCodeData) {
      Logger.warn('QR code not found for order', { orderId });
      return res.status(400).json({
        success: false,
        message: 'QR code not found for this order',
      });
    }

    Logger.success('QR data retrieved successfully', { orderId });

    res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        amount: order.amount,
        redirectUrl: order.redirectUrl,
        status: 'pending',
      },
      qrCodeDataUrl: order.qrCodeData,
    });
  } catch (error) {
    Logger.error('Error fetching QR data', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QR code data',
    });
  }
};
