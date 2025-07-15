import Logger from '../utils/logger.js';
import QRCode from 'qrcode';
import GATEWAY_TYPES from '../enums/gatewayTypes.js';

export const generateUPIQRCode = async (order, gateway) => {
  try {
    if (isNaN(order.amount)) {
      throw new Error('Invalid amount provided in the order');
    }

    // UPI QR code format: upi://pay?pa=merchant@upi&pn=MerchantName&am=amount&tn=transaction_note&cu=INR
    const upiData = {
      pa: gateway && gateway.upiId,
      pn: (gateway && gateway.name) || 'Your Company Name',
      am: order.amount.toString(),
      tn: `Pay To ${gateway.type} Merchant`,
    };

    // Add 'tr' field if gateway is Razorpay
    if (gateway && gateway.type === GATEWAY_TYPES.RAZORPAY) {
      const trValue = gateway.apiDetails?.tr;
      if (!trValue) {
        throw new Error('Transaction reference (tr) is required for Razorpay gateway');
      }
      upiData.tr = trValue;
    }

    if (!upiData.pa || !upiData.am) {
      throw new Error('Missing necessary UPI data for generating QR code');
    }

    //  if (gateway && gateway.type === GATEWAY_TYPES.RAZORPAY) {
    //   // For Razorpay, use the provided static UPI string for QR code
    //   const upiUrl =
    //     // 'upi://pay?ver=01&mode=19&pa=mmcreations668256.rzp@icici&pn=MMCreations&tr=RZPQrfHjgYrSwCMeUqrv2&am=1&cu=INR&mc=5621&qrMedium=04&
    //     tn=PaymenttoMMCreations';
    //     'upi://pay?pa=mmcreations668256.rzp@icici&pn=MMCreations&am=1&tn=PaymenttoMMCreations';
    //   const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { width: 400, height: 400, margin: 5 });
    //   return qrCodeDataUrl;
    // }

    // Construct the UPI URL dynamically for all gateways, including Razorpay

    const upiUrl = `upi://pay?${Object.entries(upiData)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')}`;

    const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { width: 400, height: 400, margin: 5 });
    return qrCodeDataUrl;
  } catch (error) {
    Logger.error('Error generating UPI QR code', {
      error: error.message,
      orderId: order.orderId,
    });
    throw new Error('Failed to generate payment QR code');
  }
};
