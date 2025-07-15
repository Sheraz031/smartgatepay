import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
// import transporter from "../config/nodemailer.js";
import Logger from '../utils/logger.js';
import generateToken from '../utils/generateToken.js';
// import {
//   EMAIL_VERIFY_TEMPLATE,
//   PASSWORD_RESET_TEMPLATE,
// } from "../config/emailTemplates.js";

// export const register = async (req, res) => {
//   const startTime = Date.now();
//   const { name, email, password } = req.body;

//   Logger.info('Registration attempt', { email, name });

//   if (!name || !email || !password) {
//     Logger.warn('Missing registration details', {
//       hasName: !!name,
//       hasEmail: !!email,
//       hasPassword: !!password,
//     });
//     return res.json({ success: false, message: 'Missing details' });
//   }

//   try {
//     const existingUser = await userModel.findOne({ email });

//     if (existingUser) {
//       Logger.warn('Registration failed - user already exists', { email });
//       return res.json({ success: false, message: 'User already exists' });
//     }

//     Logger.debug('Hashing password for registration');
//     const hashedPassword = await bcrypt.hash(password, 10);

//     Logger.debug('Creating new user in database');
//     const user = new userModel({ name, email, password: hashedPassword });
//     await user.save();

//     Logger.debug('Generating JWT token for registration');
//     generateToken(res, user._id);

//     const duration = Date.now() - startTime;
//     Logger.success('User registered successfully', {
//       userId: user._id,
//       email,
//       duration: `${duration}ms`,
//     });

//     // Sending welcome email
//     // const mailOptions = {
//     //   from: process.env.SENDER_EMAIL,
//     //   to: email,
//     //   subject: "Welcome to Elysée DEV",
//     //   text: `Welcome to payment manager website. Your account has been created with email id: ${email}`,
//     // };

//     // await transporter.sendMail(mailOptions);

//     return res.json({ success: true });
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     Logger.error('Registration error', {
//       error: error.message,
//       email,
//       duration: `${duration}ms`,
//       stack: error.stack,
//     });
//     res.json({ success: false, message: error.message });
//   }
// };

export const login = async (req, res, next) => {
  const startTime = Date.now();
  const { email, password } = req.body;

  Logger.info('Login attempt', { email });

  if (!email || !password) {
    Logger.warn('Missing login credentials', {
      hasEmail: !!email,
      hasPassword: !!password,
    });
    return res.json({
      success: false,
      message: 'Email and Password are required',
    });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      Logger.warn('Login failed - invalid email', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid Email, user not found',
      });
    }

    Logger.debug('Verifying password');
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      Logger.warn('Login failed - invalid password', { email });
      return res.status(401).json({ success: false, message: 'Invalid Password' });
    }

    Logger.debug('Checking account verification status');
    if (!user.isAccountVerified) {
      Logger.warn('Login failed - account not verified', { email });
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your account before logging in.',
      });
    }

    Logger.debug('Generating JWT token for login');
    const token = generateToken(res, user._id, user.role);

    const duration = Date.now() - startTime;
    Logger.success('User logged in successfully', {
      userId: user._id,
      email,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: true,
      userId: user._id,
      token,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error('Login error', {
      error: error.message,
      email,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    return res.status(401).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  const startTime = Date.now();
  try {
    Logger.info('Logout attempt', { userId: req.user?.id });

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: false,
      sameSite: 'strict',
    });

    const duration = Date.now() - startTime;
    Logger.success('User logged out successfully', {
      userId: req.user?.id,
      duration: `${duration}ms`,
    });

    return res.status(200).json({ success: true, message: 'Logged Out' });
  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error('Logout error', {
      error: error.message,
      userId: req.user?.id,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Send Verification OTP to the User's Email
// export const sendVerifyOtp = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     const user = await userModel.findById(userId);

//     if (user.isAccountVerified) {
//       return res.json({ success: false, message: "Account already verified" });
//     }

//     const otp = String(Math.floor(100000 + Math.random() * 900000));

//     user.verifyOtp = otp;
//     user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Account Verification OTP",
//       // text: `Your OTP is ${otp}. Verify your account using this OTP.`,
//       html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace(
//         "{{email}}",
//         user.email,
//       ),
//     };

//     await transporter.sendMail(mailOptions);

//     res.json({ success: true, message: "Verification OTP sent to your email" });
//   } catch (error) {
//     res.json({ success: false, message: error.message });
//   }
// };

// // Verify the Email using the OTP
// export const verifyEmail = async (req, res) => {
//   const { userId, otp } = req.body;

//   if (!userId || !otp) {
//     return res.json({
//       success: false,
//       message: "Missing details",
//     });
//   }

//   try {
//     const user = await userModel.findById(userId);

//     if (!user) {
//       return res.json({ success: false, message: "User not found" });
//     }

//     if (user.verifyOtp === "" || user.verifyOtp !== otp) {
//       return res.json({ success: false, message: "Invalid OTP" });
//     }

//     if (user.verifyOtpExpireAt < Date.now()) {
//       return res.json({ success: false, message: "OTP Expired" });
//     }

//     user.isAccountVerified = true;
//     user.verifyOtp = "";
//     user.verifyOtpExpireAt = 0;

//     await user.save();

//     return res.json({ success: true, message: "Email verified successfully" });
//   } catch (error) {
//     res.json({ success: false, message: error.message });
//   }
// };

// // Check if user is authenticated
// export const isAuthenticated = async (req, res) => {
//   try {
//     return res.json({ success: true });
//   } catch (error) {
//     res.json({ success: false, message: error.message });
//   }
// };

// // Send Password Reset OTP
// export const sendResetOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.json({
//       success: false,
//       message: "Email is required",
//     });
//   }

//   try {
//     const user = await userModel.findOne({ email });

//     if (!user) {
//       return res.json({ success: false, message: "User not found" });
//     }

//     const otp = String(Math.floor(100000 + Math.random() * 900000));

//     user.resetOtp = otp;
//     user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Password Reset OTP",
//       // text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`,
//       html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace(
//         "{{email}}",
//         user.email,
//       ),
//     };

//     await transporter.sendMail(mailOptions);

//     return res.json({ success: true, message: "OTP sent to your email" });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };

// // Reset User Password
// export const resetPassword = async (req, res) => {
//   const { email, otp, newPassword } = req.body;

//   if (!email || !otp || !newPassword) {
//     return res.json({
//       success: false,
//       message: "Email, OTP, and New Password are required",
//     });
//   }

//   try {
//     const user = await userModel.findOne({ email });

//     if (!user) {
//       return res.json({ success: false, message: "User Not Found" });
//     }

//     if (user.resetOtp === "" || user.resetOtp !== otp) {
//       return res.json({ success: false, message: "Invalid OTP" });
//     }

//     if (user.resetOtpExpireAt < Date.now()) {
//       return res.json({ success: false, message: "OTP Expired" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     user.password = hashedPassword;
//     user.resetOtp = "";
//     user.resetOtpExpireAt = 0;

//     await user.save();

//     return res.json({
//       success: true,
//       message: "Password has been reset successfully",
//     });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };
