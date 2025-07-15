import jwt from 'jsonwebtoken';
import Logger from '../utils/logger.js';

/**
 * userAuth middleware:
 * - Checks token in cookie (`token`) OR `Authorization: Bearer ...` header
 * - Verifies JWT using your `JWT_SECRET`
 * - Attaches `userId` and `role` to `req.body`
 */
const userAuth = async (req, res, next) => {
  let token = req.cookies.token;

  // If no cookie, try Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    Logger.info('❌ Not Authorized. No token found (cookie or header)');
    return res.status(401).json({
      success: false,
      message: 'Not Authorized. Please log in again.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded && decoded.id) {
      req.body.userId = decoded.id;
      req.body.role = decoded.role;
      next();
    } else {
      Logger.info('❌ Not Authorized. JWT verification failed — no ID.');
      return res.status(401).json({
        success: false,
        message: 'Not Authorized. Invalid token payload.',
      });
    }
  } catch (error) {
    Logger.warn('❌ Invalid JWT token.', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid or expired token.',
    });
  }
};

export { userAuth };
