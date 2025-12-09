import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { startInteractive, testExecution } from "../controllers/runInteractiveController.js";
export const interactiveRouter = express.Router();

interactiveRouter.post("/start", authMiddleware, startInteractive);
interactiveRouter.post("/test", authMiddleware, testExecution);