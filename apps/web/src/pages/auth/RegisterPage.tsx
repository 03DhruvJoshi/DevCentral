import { useState } from "react";
import { Loader2, Layers, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register account");
      }

      globalThis.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to register account",
      );
    } finally {
      setIsLoading(false);
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
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Create an account
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-9">
              Join DevCentral to manage your developer workflows.
            </p>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Full Name
                </label>
                <Input
                  id="register-name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Work Email
                </label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Password
                </label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
                <p className="text-xs text-slate-650">
                  Must be at least 6 characters.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-200 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </div>

          <div className="px-8 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <span className="text-sm text-slate-500">
              Already have an account?
            </span>
            <a
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Sign in
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-650 mt-6">
          By creating an account you agree to our{" "}
          <span className="underline cursor-pointer hover:text-slate-600">
            Terms of Service
          </span>
        </p>
      </div>
    </div>
  );
}
