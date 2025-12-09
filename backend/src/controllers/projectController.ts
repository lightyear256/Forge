import projectModel from "../Models/projectModel.js";
import {type Response,type Request} from "express"


export const createFile = async (req: Request, res: Response) => {
  try {
    const { projectId, filename, code = "" } = req.body;

    if (!projectId || !filename) {
      return res.status(400).json({ message: "projectId and filename are required" });
    }

    const project = await projectModel.findById(projectId) as any;
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const existingFileIndex = project.files.findIndex((f: any) => f.filename === filename);

    if (existingFileIndex >= 0) {
      project.files[existingFileIndex].code = code ;
      await project.save();

      return res.status(200).json({
        success: true,
        message: "File updated successfully",
        project
      });
    }

    if (project.files.length >= 5) {
      return res.status(400).json({
        message: "File limit reached! Each project can have only 5 files."
      });
    }

    const toBytes = (str: any) => Buffer.byteLength(str, "utf-8");
    let totalSize = 0;
    project.files.forEach((file: any) => {
      totalSize += toBytes(file.code);
    });
    totalSize += toBytes(code);

    const limit = 15 * 1024 * 1024; 

    if (totalSize > limit) {
      return res.status(400).json({
        message: "Project size limit exceeded! Max size allowed is 15MB."
      });
    }

    project.files.push({ filename, code });
    await project.save();

    res.status(201).json({
      success: true,
      message: "File added successfully",
      project
    });

  } catch (error) {
    console.error("Create file error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id; 

    const projects = await projectModel
      .find({ userId })
      .select('name updatedAt') 
      .sort({ updatedAt: -1 }); 

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      projects,
    });

  } catch (error) {
    console.error("Get Projects Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

export const getProjectWithFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const project = await projectModel
      .findOne({ _id: id, userId })
      .populate('files'); 

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized"
      });
    }

    res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      project,
    });

  } catch (error) {
    console.error("Get Project With Files Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required"
      });
    }

    const projectCount = await projectModel.countDocuments({ userId });
    
    if (projectCount >= 3) {
      return res.status(403).json({
        success: false,
        message: "Maximum project limit reached. You can only create 3 projects."
      });
    }

    const existingProject = await projectModel.findOne({ 
      userId, 
      name: name.trim() 
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: "Project with this name already exists"
      });
    }

    const newProject = await projectModel.create({
      userId,
      name: name.trim(),
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: newProject
    });

  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const project = await projectModel.findOne({ _id: id, userId });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized"
      });
    }

    await projectModel.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { projectId, filename,id } = req.body;

    if (!projectId || !filename) {
      return res.status(400).json({ 
        success: false,
        message: "projectId and filename are required" 
      });
    }

    const project = await projectModel.findOne({ _id: projectId, userId }) as any;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized"
      });
    }

    const fileIndex = project.files.findIndex((f: any) => f._id.toString() === id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    project.files.splice(fileIndex, 1);
    await project.save();

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
      project
    });

  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error:"hellleo"
    });
  }
};


export const renameFile = async (req: Request, res: Response) => {
  try { 
    const userId = req.user._id;
    const { projectId, id, newFilename } = req.body;

    if (!projectId || !id || !newFilename) {
      return res.status(400).json({ 
        success: false,
        message: "projectId, id, and newFilename are required" 
      });
    }

    if (!newFilename.trim()) {
      return res.status(400).json({
        success: false,
        message: "Filename cannot be empty"
      });
    }

    const project = await projectModel.findOne({ _id: projectId, userId }) as any;

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or unauthorized"
      });
    }

    const filenameExists = project.files.some((f: any) => 
      f.filename === newFilename.trim() && f._id.toString() !== id
    );

    if (filenameExists) {
      return res.status(409).json({
        success: false,
        message: "A file with this name already exists"
      });
    }

    const fileIndex = project.files.findIndex((f: any) => f._id.toString() === id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    project.files[fileIndex].filename = newFilename.trim();
    await project.save();

    return res.status(200).json({
      success: true,
      message: "File renamed successfully",
      project
    });

  } catch (error) {
    console.error("Rename file error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error"
    });
  }
};
