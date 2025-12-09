import  router from "express";
import { login, profile, register, test } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const userRouter=router();
userRouter.get("/",test)
userRouter.post("/register",register);
userRouter.post("/login",login);
userRouter.get("/profile", authMiddleware, profile);