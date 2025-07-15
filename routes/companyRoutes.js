import express from 'express';
import { userAuth } from '../middleware/userAuth.js';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  // deleteCompany,
} from '../controllers/companyController.js';

const userRouter = express.Router();

userRouter.post('/create', userAuth, createCompany);
userRouter.get('/all', userAuth, getCompanies);
userRouter.get('/:id', userAuth, getCompanyById);
userRouter.put('/:id', userAuth, updateCompany);
// userRouter.delete('/:id', userAuth, deleteCompany);

export default userRouter;
