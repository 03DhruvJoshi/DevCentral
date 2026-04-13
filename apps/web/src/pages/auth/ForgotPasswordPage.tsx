import { useState } from "react";
import {
  Loader2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send reset link");
      }

      setMessage(
        data.message ??
          "If your account exists, a reset link has been sent to your email.",
      );
    } catch (err: unknown) {
      const text =
        err instanceof Error ? err.message : "Failed to send reset link";
      setError(text);
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
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Reset your password
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-9">
              Enter your email and we&apos;ll send a reset link if an account
              exists.
            </p>
          </div>

          <div className="px-8 py-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {message && (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Email Address
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px] transition-colors"
                />
              </div>

              <Button
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm shadow-blue-200 transition-all"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </div>

          <div className="px-8 py-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-center">
            <a
              href="/login"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
