"use client";
import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

interface FormData {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
  general: string;
}

const GlassInputWrapper = ({
  children,
  hasError,
}: {
  children: React.ReactNode;
  hasError?: boolean;
}) => (
  <div
    className={`group rounded-xl border ${hasError ? "border-rose-400/50" : "border-gray-700/50"} bg-gray-800/80 backdrop-blur-md transition-all duration-300 hover:border-purple-400/50 focus-within:border-purple-400 focus-within:shadow-lg focus-within:shadow-purple-500/10`}
  >
    {children}
  </div>
);

export default function ResetPassword() {
  const router = useRouter();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
    general: "",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: "",
      resetCode: "",
      newPassword: "",
      confirmPassword: "",
      general: "",
    };

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.resetCode) {
      newErrors.resetCode = "Reset code is required";
    } else if (formData.resetCode.length !== 6) {
      newErrors.resetCode = "Reset code must be 6 digits";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.values(newErrors).some((error) => error)) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/user/reset-password`,
        {
          email: formData.email,
          resetCode: formData.resetCode,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        setResetSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br from-gray-950 via-black to-gray-900 text-gray-50 items-center justify-center">
        <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold">
                  Password Reset Successful!
                </h1>
                <p className="text-gray-400 text-lg">
                  Your password has been updated. You'll be redirected to login
                  shortly.
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-green-400 text-sm font-medium">
                  You can now log in with your new password
                </p>
              </div>

              <Link
                href="/login"
                className="inline-block w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-3.5 font-semibold text-white transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pt-25 min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br from-gray-950 via-black to-gray-900 text-gray-50">
      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 pt-28 lg:pt-12">
        <div className="w-full max-w-lg">
          <div className="flex flex-col gap-8">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Create New Password</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Reset Password
              </h1>
              <p className="text-gray-400 text-lg">
                Enter your email, reset code, and new password
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Email Address
                </label>
                <GlassInputWrapper hasError={!!errors.email}>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full bg-transparent text-base p-3.5 rounded-xl focus:outline-none text-gray-50 placeholder:text-gray-500"
                    required
                  />
                </GlassInputWrapper>
                {errors.email && (
                  <span className="text-rose-400 text-sm mt-1.5 block">
                    {errors.email}
                  </span>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Reset Code (6 digits)
                </label>
                <GlassInputWrapper hasError={!!errors.resetCode}>
                  <input
                    type="text"
                    placeholder="000000"
                    value={formData.resetCode}
                    onChange={(e) =>
                      handleInputChange(
                        "resetCode",
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    maxLength={6}
                    className="w-full bg-transparent text-base p-3.5 rounded-xl focus:outline-none text-gray-50 placeholder:text-gray-500 text-center tracking-[0.3em] font-mono"
                    required
                  />
                </GlassInputWrapper>
                {errors.resetCode && (
                  <span className="text-rose-400 text-sm mt-1.5 block">
                    {errors.resetCode}
                  </span>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  New Password
                </label>
                <GlassInputWrapper hasError={!!errors.newPassword}>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={(e) =>
                        handleInputChange("newPassword", e.target.value)
                      }
                      className="w-full bg-transparent text-base p-3.5 pr-12 rounded-xl focus:outline-none text-gray-50 placeholder:text-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-3 flex items-center group"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
                {errors.newPassword && (
                  <span className="text-rose-400 text-sm mt-1.5 block">
                    {errors.newPassword}
                  </span>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Confirm Password
                </label>
                <GlassInputWrapper hasError={!!errors.confirmPassword}>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className="w-full bg-transparent text-base p-3.5 pr-12 rounded-xl focus:outline-none text-gray-50 placeholder:text-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-3 flex items-center group"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
                {errors.confirmPassword && (
                  <span className="text-rose-400 text-sm mt-1.5 block">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              {errors.general && (
                <div className="bg-rose-500/10 border border-rose-400/30 rounded-xl p-4 backdrop-blur-sm">
                  <span className="text-rose-400 text-sm font-medium">
                    {errors.general}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-3.5 font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  "Resetting Password..."
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                <span className="text-gray-300 font-semibold">
                  🔒 Security:
                </span>{" "}
                Your password will be encrypted and stored securely
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
