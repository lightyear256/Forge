import router from "express";
import {
  deleteUserAccount,
  forgetPassword,
  getUserStats,
  login,
  logout,
  profile,
  register,
  resetPassword,
  test,
  updateUserProfile,
  validateResetToken,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const userRouter = router();
userRouter.get("/", test);
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/forget-password", forgetPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/validate-reset-token", validateResetToken);
userRouter.get("/profile", authMiddleware, profile);
userRouter.put("/update", authMiddleware, updateUserProfile);
userRouter.get("/stats", authMiddleware, getUserStats);
userRouter.delete("/delete", authMiddleware, deleteUserAccount);
userRouter.post("/logout", logout);
