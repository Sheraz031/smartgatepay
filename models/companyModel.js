import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: false,
      match: [/^(\+?\d{1,4}[\s-]?)?\d{7,15}$/, 'Please enter a valid phone number'],
    },
    address: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const companyModel = mongoose.models.Company || mongoose.model('Company', companySchema);
export default companyModel;
