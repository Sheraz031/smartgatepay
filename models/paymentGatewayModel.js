import mongoose from 'mongoose';
import GATEWAY_TYPES from '../enums/gatewayTypes.js';

const paymentGatewaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, enum: Object.values(GATEWAY_TYPES) },
    phone: {
      type: String,
      match: [/^(\+?\d{1,4}[\s-]?)?\d{7,15}$/, 'Please enter a valid phone number'],
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },

    apiKey: { type: String, required: true },
    upiId: { type: String, required: true },
    merchantId: { type: String, required: true },
    webhookUrl: { type: String, default: '' },

    apiDetails: {
      apiToken: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
      tr: { type: String, default: '' },
      accesskeyId: { type: String, default: '' },
      merchantKey: { type: String, default: '' },
      cookie: { type: String, default: '' },
      xsrf: { type: String, default: '' },
    },

    priority: { type: Number, default: 0 },
    dailyLimit: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentGatewaySchema.index({ apiKey: 1 });

const paymentGatewayModel =
  mongoose.models.PaymentGateway || mongoose.model('PaymentGateway', paymentGatewaySchema);

export default paymentGatewayModel;
