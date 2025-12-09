import {Router} from "express";
import { createFile, createProject, deleteFile, deleteProject, getAllProject, getProjectWithFiles, renameFile } from "../controllers/projectController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const projectRouter = Router();

projectRouter.use(authMiddleware)
projectRouter.post("/create", createProject)
projectRouter.get('/', getAllProject)
projectRouter.post('/create_file', createFile)
projectRouter.delete('/delete_file', deleteFile)  
projectRouter.put('/rename_file',renameFile);
projectRouter.delete('/:id', deleteProject)        
projectRouter.get('/:id', getProjectWithFiles)