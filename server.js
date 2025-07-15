import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import connectDB from './config/mongodb.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import paymentGatewayRouter from './routes/paymentGatewayRoutes.js';
import transactionRouter from './routes/transactionRoutes.js';
import companyRouter from './routes/companyRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import Logger from './utils/logger.js';

const app = express();
const port = process.env.PORT || 5000;

let isDbConnected = false;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.includes(',')
    ? process.env.ALLOWED_ORIGINS.split(',').map((url) => url.trim())
    : [process.env.ALLOWED_ORIGINS.trim()]
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      Logger.info('Incoming request Origin:', origin || 'No Origin (Postman?)');

      if (!origin) {
        Logger.info('No origin detected — likely Postman or server-to-server request. Allowing.');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        Logger.info(`Origin ${origin} is allowed. Allowing request.`);
        return callback(null, true);
      } else {
        Logger.error(`CORS BLOCKED - Origin ${origin} is not in allowed list.`);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

connectDB()
  .then(() => {
    isDbConnected = true;
    Logger.success('MongoDB connected');
  })
  .catch((err) => {
    isDbConnected = false;
    Logger.error('MongoDB connection failed:', err);
  });

app.use((req, res, next) => {
  if (!isDbConnected) {
    Logger.error('Request received but DB is not connected to', process.env.MONGODB_URI);
    return res.status(503).json({ success: false, message: 'Database not connected' });
  }
  next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(Logger.request);

// API Endpoints
app.get('/', (req, res) => {
  if (!isDbConnected) {
    return res.status(503).send('API running, but database not connected');
  }
  Logger.info('Health check endpoint accessed');
  res.send('API Working');
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/company', companyRouter);
app.use('/api/paymentGateway', paymentGatewayRouter);
app.use('/api/transaction', transactionRouter);
app.use('/api/order', orderRouter);

// Error handling middleware - should be last
app.use(Logger.errorHandler);

app.listen(port, () => {
  Logger.success(`Server started on PORT: ${port}`);
  Logger.info('Server configuration', {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins,
  });
});
