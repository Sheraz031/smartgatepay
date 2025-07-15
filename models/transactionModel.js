import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: () => randomUUID(),
    },

    amount: {
      type: Number,
      required: true,
    },

    gateway: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentGateway',
      required: true,
    },

    customerEmail: {
      type: String,
      required: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    utrNumber: {
      type: String,
      trim: true,
    },

    gatewayTransactionData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    paymentMethod: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const transactionModel =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default transactionModel;
