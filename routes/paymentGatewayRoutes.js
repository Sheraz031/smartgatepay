import express from 'express';
import { userAuth } from '../middleware/userAuth.js';
import {
  createPaymentGateway,
  getAllPaymentGateways,
  getPaymentGatewayById,
  updatePaymentGateway,
  // deletePaymentGateway,
  verifyPaymentGateway,
} from '../controllers/paymentGatewayController.js';

const paymentGatewayRouter = express.Router();

paymentGatewayRouter.post('/create', userAuth, createPaymentGateway);
paymentGatewayRouter.get('/all', userAuth, getAllPaymentGateways);
paymentGatewayRouter.get('/:id', userAuth, getPaymentGatewayById);
paymentGatewayRouter.put('/:id', userAuth, updatePaymentGateway);
// paymentGatewayRouter.delete('/:id', userAuth, deletePaymentGateway);
paymentGatewayRouter.post('/verify-gateway', verifyPaymentGateway);

export default paymentGatewayRouter;
