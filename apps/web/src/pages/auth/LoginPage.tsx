import { useState } from "react";
import { Loader2, Layers, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      const role = data?.user?.role as string | undefined;

      if (!res.ok) {
        if (data.emailNotVerified && data.email) {
          globalThis.location.href = `/verify-email?email=${encodeURIComponent(data.email)}`;
          return;
        }
        throw new Error(data.error ?? "Login failed");
      }

      if (role === "ADMIN") {
        // For admin users, we want to bypass email verification and log them in directly
        localStorage.setItem("devcentral_token", data.token);
        localStorage.setItem("devcentral_user", JSON.stringify(data.user));

        globalThis.location.href = "/admin";
        return;
      }

      // Save the token to local storage
      localStorage.setItem("devcentral_token", data.token);
      localStorage.setItem("devcentral_user", JSON.stringify(data.user));

      // Redirect to the Dashboard
      if (role === "DEV") {
        globalThis.location.href = "/dashboard"; // DEV
      } else {
        globalThis.location.href = "/admin"; // ADMIN
      }
    } catch (err: unknown) {
      const message = (err as Error).message;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "#f8fafc" }}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Soft center glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 75%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-sm shadow-blue-200">
              <Layers className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              DevCentral
            </span>
          </div>
          <p className="text-xs text-slate-650 mt-1 font-medium tracking-wide uppercase">
            Internal Developer Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to access your developer workspace.
            </p>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-200 transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>

          <div className="px-8 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <span className="text-sm text-slate-500">
              Don&apos;t have an account?
            </span>
            <a
              href="/register"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create one
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-650 mt-6">
          By signing in you agree to our{" "}
          <span className="underline cursor-pointer hover:text-slate-600">
            Terms of Service
          </span>
        </p>
      </div>
    </div>
  );
}
