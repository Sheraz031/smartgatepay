import jwt from 'jsonwebtoken';

const generateToken = (res, userId, userRole) => {
  const payload = { id: userId };

  if (userRole !== undefined) {
    payload.role = userRole;
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('token', token, {
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
};

export default generateToken;
