import projectModel from "../Models/projectModel.js";
import { interactiveQueue } from "../queue/interactiveQueue.js";
import { type Response, type Request } from 'express';
import runDocker from "../utils/dockerRunner.js";
export const startInteractive = async (req: Request, res: Response) => {
  const { projectId, filename, language, socketId } = req.body;

  if (!socketId) {
    return res.status(400).json({
      success: false,
      error: "Socket ID required"
    });
  }

  const project = await projectModel.findById(projectId) as any;
  if (!project) {
    return res.status(404).json({
      success: false,
      error: "Project not found"
    });
  }

  const file = project.files.find((f: any) => f.filename === filename);
  if (!file) {
    return res.status(404).json({
      success: false,
      error: "File not found"
    });
  }

  const job = await interactiveQueue.add("startInteractive", {
    code: file.code,
    language,
    socketId
  });

  return res.json({
    success: true,
    jobId: job.id
  });
};

export const testExecution = async (req: Request, res: Response) => {
  const { projectId, filename, language, inputs } = req.body;

  const project = await projectModel.findById(projectId) as any;
  const file = project.files.find((f: any) => f.filename === filename);

  const inputString = inputs?.join("\n") || "";

  const result = await runDocker(language, file.code, inputString);

  return res.json({
    success: true,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error
  });
};