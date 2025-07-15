import express from 'express';
import { checkApiToken } from '../middleware/userAuth.js';
import { createOrder, getOrderQRData } from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post('/create', checkApiToken, createOrder);
orderRouter.get('/qr-data/:orderId', getOrderQRData);
export default orderRouter;
