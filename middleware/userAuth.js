import jwt from 'jsonwebtoken';
import Logger from '../utils/logger.js';
import paymentGatewayModel from '../models/paymentGatewayModel.js';

const userAuth = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    Logger.info('Not Authorized. No token found!');
    return res.json({
      success: false,
      message: 'Not Authorized. Logged In Again',
    });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

    if (tokenDecode.id) {
      req.body.userId = tokenDecode.id;
      req.body.role = tokenDecode.role;
    } else {
      Logger.info('Not Authorized. jwt verification issue!');
      return res.json({
        success: false,
        message: 'Not Authorized. Logged In Again',
      });
    }

    next();
  } catch (error) {
    Logger.warn('Not Authorized. Invalid jwt token!');
    res.json({ success: false, message: error.message });
  }
};

const checkApiToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!bearerToken) {
    return res.status(401).json({
      success: false,
      message: 'Not Authorized. API token is missing.',
    });
  }

  try {
    const gateway = await paymentGatewayModel.findOne({ apiKey: bearerToken });

    if (!gateway) {
      Logger.info('Not Authorized. Invalid API token.');
      return res.status(401).json({
        success: false,
        message: 'Not Authorized. Invalid API token.',
      });
    }

    if (gateway.status === 'inactive') {
      Logger.warn('Gateway access denied - inactive status', {
        gatewayId: gateway._id,
        gatewayName: gateway.name,
      });
      return res.status(403).json({
        success: false,
        message:
          'Gateway is currently inactive. Please contact support to activate your payment gateway.',
      });
    }

    req.body.gateway = gateway;
    return next();
  } catch (error) {
    Logger.error('Error during API token validation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error. Please try again later.',
    });
  }
};

export { userAuth, checkApiToken };
