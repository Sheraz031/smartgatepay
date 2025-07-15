import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
import Logger from '../utils/logger.js';
import generateToken from '../utils/generateToken.js';

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    Logger.info('Getting user data', { id });
    const user = await userModel.findById(id).select('-password');

    if (!user) {
      Logger.warn('User not found', { id });
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }

    Logger.success('User data retrieved successfully', {
      id,
      isAccountVerified: user.isAccountVerified,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    Logger.error('Error getting user data', {
      error: error.message,
      id: req.body.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;

    Logger.info('Creating new user', {
      email,
      name,
      hasPassword: !!password,
      hasPhone: !!phone,
      hasRole: !!role,
      hasAddress: !!address,
    });

    if (!name || !email || !password) {
      Logger.warn('Missing required fields for user creation', {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
      });
      return res.json({
        success: false,
        message: 'All required fields are missing',
      });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      Logger.warn('Email already registered', { email });
      return res.json({ success: false, message: 'Email already registered' });
    }

    Logger.debug('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    Logger.debug('Creating user in database');
    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      address,
    });

    Logger.debug('Generating JWT token');
    generateToken(res, newUser._id, newUser.role);

    Logger.success('User created successfully', {
      id: newUser._id,
      email,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    Logger.error('Error creating user', {
      error: error.message,
      email: req.body.email,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    Logger.info('Getting all users data');
    const users = await userModel.find().select('-password');
    Logger.success('User data retrieved successfully');
    res.status(200).json({ success: true, users });
  } catch (error) {
    Logger.error('Error getting user data', {
      error: error.message,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, email, password } = req.body;

    Logger.info('Updating user data', { id });

    if (email || phone) {
      const existingUser = await userModel.findOne({
        $or: [email ? { email } : null, phone ? { phone } : null].filter(Boolean),
        _id: { $ne: id },
      });

      if (existingUser) {
        let conflictField = null;
        if (existingUser.email === email) conflictField = 'Email';
        else if (existingUser.phone === phone) conflictField = 'Phone number';

        Logger.warn(`${conflictField} already in use`, { email, phone });
        return res.status(409).json({
          success: false,
          message: `${conflictField} is already in use`,
        });
      }
    }

    const updateData = { name, phone, role };
    if (email) updateData.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const user = await userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password');

    if (!user) {
      Logger.warn('User not found', { id });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    Logger.success('User data updated successfully', { id });
    res.status(200).json({ success: true, message: 'User updated', user });
  } catch (error) {
    Logger.error('Error updating user data', {
      error: error.message,
      id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    Logger.info('Deleting user data', { id });
    const deletedUser = await userModel.findByIdAndDelete(id);

    if (!deletedUser) {
      Logger.warn('User not found', { id });
      return res.json({ success: false, message: 'User not found' });
    }

    Logger.success('User data deleted successfully', {
      id,
    });
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    Logger.error('Error getting user data', {
      error: error.message,
      id: req.body.id,
      stack: error.stack,
    });
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserDataByCookie = async (req, res) => {
  const startTime = Date.now();
  const { userId } = req.body;

  try {
    Logger.info('Get user data attempt', { userId });

    if (!userId) {
      Logger.warn('Get user data failed - no user ID found');
      return res.status(401).json({
        success: false,
        message: 'User ID not found. Please login again.',
      });
    }

    const user = await userModel
      .findById(userId)
      .select('-password -verifyOtp -verifyOtpExpireAt -resetOtp -resetOtpExpireAt');

    if (!user) {
      Logger.warn('Get user data failed - user not found', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const duration = Date.now() - startTime;
    Logger.success('User data retrieved successfully', {
      userId: user._id,
      email: user.email,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isAccountVerified: user.isAccountVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error('Get user data error', {
      error: error.message,
      userId: req.body.userId,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    return res.status(400).json({
      success: false,
      message: 'Error retrieving user data',
    });
  }
};
