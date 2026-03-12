"use client";
import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/authContext";
import axios from "axios";
import Image from "next/image";

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email: string;
  password: string;
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

const TestimonialCard = ({
  testimonial,
  delay,
}: {
  testimonial: Testimonial;
  delay: string;
}) => (
  <div
    className={`${delay} flex items-start gap-3 rounded-2xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl border border-gray-700/40 p-4 w-64 opacity-0 animate-[slideUp_0.6s_ease-out_forwards] hover:scale-105 transition-transform duration-300`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 object-cover rounded-full ring-2 ring-purple-500/30"
      alt="avatar"
    />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-semibold text-gray-50">
        {testimonial.name}
      </p>
      <p className="text-gray-400 text-xs">{testimonial.handle}</p>
      <p className="mt-1.5 text-gray-300 text-xs">{testimonial.text}</p>
    </div>
  </div>
);

export default function Login() {
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    password: "",
    general: "",
  });

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    try {
      setErrors({
        email: "",
        password: "",
        general: "",
      });

      const registrationData = {
        ...formData,
      };

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/user/login`,
        registrationData,
        { withCredentials: true },
      );

      console.log(result);

      setFormData({
        email: "",
        password: "",
      });

      checkAuth();
      window.dispatchEvent(new Event("authStateChanged"));
      router.replace("/dashboard");
    } catch (error: any) {
      console.log("Full error:", error.response?.data);

      if (error.response?.data?.error) {
        const backendErrors = error.response.data.error;

        const transformedErrors: FormErrors = {
          email: "",
          password: "",
          general: "",
        };

        if (typeof backendErrors === "object" && backendErrors !== null) {
          const fieldMapping: { [key: string]: keyof FormErrors } = {
            email: "email",
            password: "password",
            general: "general",
          };

          Object.entries(backendErrors).forEach(
            ([field, fieldError]: [string, any]) => {
              if (
                field === "_errors" &&
                Array.isArray(fieldError) &&
                fieldError.length > 0
              ) {
                transformedErrors.general = fieldError[0];
              } else if (
                fieldError &&
                fieldError._errors &&
                Array.isArray(fieldError._errors) &&
                fieldError._errors.length > 0
              ) {
                const frontendField = fieldMapping[field];
                if (frontendField) {
                  transformedErrors[frontendField] = fieldError._errors[0];
                }
              }
            },
          );
        } else if (typeof backendErrors === "string") {
          transformedErrors.general = backendErrors;
        }
        setErrors(transformedErrors);
      } else {
        setErrors((prev) => ({
          ...prev,
          general: "Login failed. Please try again.",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-25 min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br from-gray-950 via-black to-gray-900 text-gray-50">
      <section className="flex-1 flex items-center justify-center p-6 lg:p-12 pt-28 lg:pt-12">
        <div className="w-full max-w-lg">
          <div className="flex flex-col gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Welcome back</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Sign In
              </h1>
              <p className="text-gray-400 text-lg">
                Continue your learning journey
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Email
                </label>
                <GlassInputWrapper hasError={!!errors.email}>
                  <input
                    name="email"
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
                  Password
                </label>
                <GlassInputWrapper hasError={!!errors.password}>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="w-full bg-transparent text-base p-3.5 pr-12 rounded-xl focus:outline-none text-gray-50 placeholder:text-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center group"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
                {errors.password && (
                  <span className="text-rose-400 text-sm mt-1.5 block">
                    {errors.password}
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="w-4 h-4 rounded border-2 border-gray-600 bg-transparent checked:bg-purple-600 checked:border-purple-600 cursor-pointer transition-all"
                  />
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-3.5 font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  "Signing In..."
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="hidden lg:block flex-1 relative p-6">
        <div className=" animate-[slideRight_0.8s_ease-out_0.3s_forwards] absolute inset-6 rounded-3xl bg-cover bg-center shadow-2xl">
          <Image
            src={"/assets/side.jpeg"}
            className="rounded-xl"
            alt="side"
            height={900}
            width={900}
          />
        </div>
      </section>
    </div>
  );
}
