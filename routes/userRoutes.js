import express from 'express';
import { userAuth } from '../middleware/userAuth.js';
import {
  createUser,
  getAllUsers,
  updateUser,
  // deleteUser,
  getUserById,
  getUserDataByCookie,
} from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/create', createUser);
userRouter.get('/user-data', userAuth, getUserDataByCookie);
userRouter.get('/all', userAuth, getAllUsers);
userRouter.get('/:id', userAuth, getUserById);
userRouter.put('/:id', userAuth, updateUser);
// userRouter.delete('/:id', userAuth, deleteUser);

export default userRouter;
