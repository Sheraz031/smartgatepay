import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () => randomUUID(),
    },

    customerName: {
      type: String,
      required: false,
      trim: true,
    },

    customerEmail: {
      type: String,
      required: false,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    customerPhone: {
      type: String,
      required: false,
      match: [/^(\+?\d{1,4}[\s-]?)?\d{7,15}$/, 'Please enter a valid phone number'],
    },

    redirectUrl: {
      type: String,
      required: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
    },

    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },

    udf1: {
      type: String,
      required: false,
      trim: true,
    },

    udf2: {
      type: String,
      required: false,
      trim: true,
    },

    udf3: {
      type: String,
      required: false,
      trim: true,
    },

    qrCodeData: {
      type: String,
      required: false,
    },

    status: {
      type: String,
      required: false,
    },

    createdFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentGateway',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ customerEmail: 1 });
orderSchema.index({ createdAt: -1 });

const orderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default orderModel;
