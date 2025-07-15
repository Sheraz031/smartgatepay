import express from 'express';
import { userAuth } from '../middleware/userAuth.js';
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  // deleteTransaction,
  filterTransactions,
  submitTransactionUTR,
} from '../controllers/transactionController.js';

const transactionRouter = express.Router();

transactionRouter.post('/create', userAuth, createTransaction);
transactionRouter.post('/submit-utr', submitTransactionUTR);
transactionRouter.get('/all', userAuth, getAllTransactions);
transactionRouter.get('/filter', userAuth, filterTransactions);
transactionRouter.get('/:id', getTransactionById);
transactionRouter.put('/:id', userAuth, updateTransaction);
// transactionRouter.delete('/:id', userAuth, deleteTransaction);

export default transactionRouter;
