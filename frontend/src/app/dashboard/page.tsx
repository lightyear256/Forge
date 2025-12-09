"use client";
import { useEffect, useState } from "react";
import TextType from "../components/textType";
import { useAuth } from "../context/authContext";
import { Link, Trash, Plus, AlertTriangle } from "lucide-react";
import axios from "axios";
import {useRouter} from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface Project {
  _id: string;
  name: string;
  updatedAt: Date;
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const toTitleCase = (str: string) =>
    str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );

  const fetchProjects = async () => {
    try {
      setIsFetching(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/project/`,
        {
          withCredentials: true,
        }
      );
      setProjects(response.data.projects);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch projects");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/project/create`,
        { name: projectName },
        {
          withCredentials: true,
        }
      );
      
      setProjects([...projects, response.data.project]);
      setProjectName("");
      setIsModalOpen(false);
      toast.success("Project created successfully!");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to create project";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    setProjectToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/project/${projectToDelete.id}`,
        {
          withCredentials: true,
        }
      );
      setProjects(projects.filter((p) => p._id !== projectToDelete.id));
      toast.success("Project deleted successfully");
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete project");
      console.log(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateProject();
    }
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "rgba(15, 23, 42, 0.95)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            backdropFilter: "blur(12px)",
          },
          success: {
            iconTheme: {
              primary: "#a855f7",
              secondary: "#0f172a",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#0f172a",
            },
          },
        }}
      />

      <div className="pt-25 px-6 md:px-12 lg:px-20 min-h-screen w-full bg-black text-gray-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <TextType
            text={[`Hello ${user?.name ? toTitleCase(user.name) : "User"}`]}
            typingSpeed={45}
            pauseDuration={2000}
            showCursor={true}
            cursorCharacter="_"
            className="text-2xl md:text-4xl lg:text-5xl font-light tracking-tight"
            loop={false}
          />

          <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm uppercase tracking-widest text-slate-500 mb-1">
                  Projects
                </h2>
                <p className="text-3xl font-light">
                  {isFetching ? "..." : projects.length}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={projects.length >= 3}
                className="flex rounded-xl items-center gap-2 px-5 py-2 border border-slate-700 hover:border-purple-500 hover:bg-purple-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700 disabled:hover:bg-transparent"
                title={projects.length >= 3 ? "Maximum 3 projects allowed" : "Create new project"}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New</span>
              </button>
            </div>

            {isFetching ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-slate-500">Loading projects...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto border-2 border-dashed border-slate-700 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-500">No projects</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4"
                  >
                    Create one now
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-px">
                {projects.map((project, index) => (
                  <div key={project._id} className="border-b border-slate-800 group">
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                          <h3 className="text-2xl truncate group-hover:text-purple-400 transition-colors">
                            {project.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600 font-mono">
                          Updated {new Date(project.updatedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast("Opening project...",);
                            router.push(`/editor/${project._id}`)
                          }}
                          className="p-2"
                          title="Open"
                        >
                          <Link className="w-4 h-4 text-slate-500 hover:text-green-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id, project.name);
                          }}
                          className="p-2"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4 text-slate-500 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full rounded-xl max-w-md bg-black border border-slate-800">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-light">New Project</h3>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-3">
                    Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="untitled"
                    className="w-full px-0 py-2 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-gray-50 placeholder-slate-700 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setProjectName("");
                    }}
                    className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!projectName.trim() || isLoading}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 text-sm transition-colors"
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDeleteModalOpen && projectToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full rounded-xl max-w-md bg-black border border-slate-800">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-light">Delete Project</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-slate-400 text-sm">
                  Are you sure you want to delete{" "}
                  <span className="text-slate-200 font-medium">"{projectToDelete.name}"</span>?
                  This action cannot be undone.
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setProjectToDelete(null);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:text-red-400 text-sm transition-colors"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}