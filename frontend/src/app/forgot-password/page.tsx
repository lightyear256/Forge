"use client";
import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Sparkles, Mail } from "lucide-react";
import Link from "next/link";
import axios from "axios";

interface FormErrors {
  email: string;
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    general: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ email: "", general: "" });

    try {
      if (!email) {
        setErrors((prev) => ({ ...prev, email: "Email is required" }));
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/user/forget-password`,
        { email },
        { withCredentials: true },
      );

      if (response.data.success) {
        setResetToken(response.data.token);
        setSubmitted(true);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to send reset code. Please try again.";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br from-gray-950 via-black to-gray-900 text-gray-50 items-center justify-center">
        <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20">
                <Mail className="w-8 h-8 text-green-400" />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl font-bold">Check Your Email</h1>
                <p className="text-gray-400 text-lg">
                  We've sent a password reset code to{" "}
                  <span className="text-purple-400 font-semibold">{email}</span>
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-green-400 text-sm">
                  <span className="font-semibold">Code sent successfully!</span>{" "}
                  Check your email (including spam folder) for the reset code.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-gray-400">
                  The reset code will expire in{" "}
                  <span className="text-purple-400 font-semibold">
                    15 minutes
                  </span>
                </p>

                <Link
                  href="/reset-password"
                  className="inline-block w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-3.5 font-semibold text-white transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue to Reset Password
                </Link>

                <Link
                  href="/login"
                  className="inline-block w-full rounded-xl border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/60 py-3.5 font-semibold text-white transition-all duration-300"
                >
                  Back to Login
                </Link>
              </div>

              <p className="text-gray-500 text-sm">
                Didn't receive an email? Check your spam folder or{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  try again
                </button>
              </p>
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
              href="/login"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors font-medium w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Reset Password</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Forgot Password?
              </h1>
              <p className="text-gray-400 text-lg">
                Enter your email and we'll send you a reset code
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email)
                        setErrors((prev) => ({ ...prev, email: "" }));
                    }}
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
                  "Sending Reset Code..."
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                <span className="text-gray-300 font-semibold">💡 Tip:</span>{" "}
                Check your spam or promotion folder if you don't see the email
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
