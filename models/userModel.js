import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: {
      type: String,
      required: false,
      match: [/^(\+?\d{1,4}[\s-]?)?\d{7,15}$/, 'Please enter a valid phone number'],
    },

    role: {
      type: String,
      enum: ['manager', 'admin', 'user'],
      default: 'user',
    },

    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerified: { type: Boolean, default: true },
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.models.User || mongoose.model('User', userSchema);

export default userModel;
