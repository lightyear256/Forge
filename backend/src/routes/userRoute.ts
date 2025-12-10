import  router from "express";
import { deleteUserAccount, getUserStats, login, profile, register, test, updateUserProfile } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const userRouter=router();
userRouter.get("/",test)
userRouter.post("/register",register);
userRouter.post("/login",login);
userRouter.get("/profile", authMiddleware, profile);
userRouter.put('/update', authMiddleware, updateUserProfile);
userRouter.get('/stats', authMiddleware, getUserStats);
userRouter.delete('/delete', authMiddleware, deleteUserAccount);