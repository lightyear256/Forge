"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { User, Mail, Calendar, Shield, Edit2, Check, X, ArrowLeft, AlertTriangle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function Profile() {
  const {user, checkAuth} = useAuth() as any;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalFiles: 0,
    lastActive: new Date(),
  });

  const CONFIRM_TEXT = "delete my account";

  const toTitleCase = (str: string) =>
    str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/project/`,
        { withCredentials: true }
      );
      const projects = response.data.projects || [];
      const totalFiles = projects.reduce((acc: number, project: any) => 
        acc + (project.files?.length || 0), 0
      );
      
      setStats({
        totalProjects: projects.length,
        totalFiles: totalFiles,
        lastActive: new Date(),
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/user/update`,
        { name, email },
        { withCredentials: true }
      );
      
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== CONFIRM_TEXT) {
      toast.error("Please type the confirmation text correctly");
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/user/delete`,
        { withCredentials: true }
      );

      toast.success("Account deleted successfully");
      setIsDeleteModalOpen(false);
      
      checkAuth();
      
      setTimeout(() => {
        router.replace('/');
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && confirmText.toLowerCase() === CONFIRM_TEXT) {
      handleDeleteAccount();
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setIsEditing(false);
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

      <div className="pt-20 md:pt-25 px-4 sm:px-6 md:px-12 lg:px-20 min-h-screen w-full bg-black text-gray-50">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 md:pb-6">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 md:p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-500 hover:text-purple-400" />
              </button>
              <div>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                  Profile
                </h2>
                <p className="text-xl md:text-2xl font-light">
                  {user?.name ? toTitleCase(user.name) : "User"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-800">
            <div className="bg-black p-4 md:p-6 border-b sm:border-b-0 sm:border-r border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  Projects
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-light">{stats.totalProjects}</p>
            </div>
            <div className="bg-black p-4 md:p-6 border-b sm:border-b-0 sm:border-r border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  Files
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-light">{stats.totalFiles}</p>
            </div>
            <div className="bg-black p-4 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  Member Since
                </span>
              </div>
              <p className="text-sm md:text-base font-light text-slate-400">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                }) : "Recent"}
              </p>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="flex items-end justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm uppercase tracking-widest text-slate-500">
                Information
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-700 hover:border-purple-500 hover:bg-purple-500/5 transition-all text-xs md:text-sm"
                >
                  <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 border border-slate-700 hover:border-slate-600 transition-all text-xs md:text-sm disabled:opacity-50"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 transition-colors text-xs md:text-sm"
                  >
                    <Check className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">{isLoading ? "Saving..." : "Save"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-px">
              <div className="border-b border-slate-800 p-4 md:p-6">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2 md:mb-3">
                      Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-0 py-1.5 md:py-2 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-sm md:text-base text-gray-50 placeholder-slate-700 transition-colors"
                        placeholder="Enter your name"
                      />
                    ) : (
                      <p className="text-sm md:text-base text-slate-300 break-words">
                        {user?.name ? toTitleCase(user.name) : "Not set"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-800 p-4 md:p-6">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2 md:mb-3">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-0 py-1.5 md:py-2 bg-transparent border-b border-slate-800 focus:border-purple-500 focus:outline-none text-sm md:text-base text-gray-50 placeholder-slate-700 transition-colors"
                        placeholder="Enter your email"
                      />
                    ) : (
                      <p className="text-sm md:text-base text-slate-300 break-all">
                        {user?.email || "Not set"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-800 p-4 md:p-6">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2 md:mb-3">
                      User ID
                    </label>
                    <p className="text-xs md:text-sm font-mono text-slate-500 break-all">
                      {user?._id || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2 md:mb-3">
                      Account Created
                    </label>
                    <p className="text-sm md:text-base text-slate-300">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 pt-8 md:pt-12">
            <div className="border-b border-red-900/20 pb-4">
              <h3 className="text-sm uppercase tracking-widest text-red-500/70">
                Danger Zone
              </h3>
            </div>
            <div className="border border-red-900/20 bg-red-950/5 p-4 md:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm md:text-base font-light text-slate-300 mb-1">
                    Delete Account
                  </h4>
                  <p className="text-xs md:text-sm text-slate-500">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 border border-red-900/50 text-red-400 hover:bg-red-950/20 transition-colors text-xs md:text-sm whitespace-nowrap"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full rounded-xl max-w-md bg-black border border-slate-800">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-light">Delete Account</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-400 text-sm leading-relaxed">
                This action <span className="text-red-400 font-medium">cannot be undone</span>. 
                This will permanently delete your account, all {stats.totalProjects} projects, 
                {stats.totalFiles} files, and remove all your data from our servers.
              </p>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Type <span className="text-red-400 font-mono">{CONFIRM_TEXT}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="delete my account"
                  className="w-full px-4 py-2.5 bg-transparent border border-slate-800 focus:border-red-500 focus:outline-none text-sm text-gray-50 placeholder-slate-700 transition-colors"
                  autoFocus
                  disabled={isDeleting}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setConfirmText("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText.toLowerCase() !== CONFIRM_TEXT || isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:text-red-400 text-sm transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}