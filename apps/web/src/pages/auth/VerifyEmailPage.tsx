import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function VerifyEmailPage() {
  const email = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("email") ?? "";
  }, []);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Missing email address. Please go back and register again.");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Verification failed.");
      }

      // Store the auto-issued JWT so /connect-github can use it immediately
      if (data.token) {
        localStorage.setItem("devcentral_token", data.token);
        localStorage.setItem("devcentral_user", JSON.stringify(data.user ?? {}));
      }
      setSuccess(data.message ?? "Email verified! Setting up your account...");
      setTimeout(() => {
        globalThis.location.href = "/connect-github";
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendMessage("");
    setError("");
    setIsResending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to resend code.");
      }

      setResendMessage(data.message ?? "A new code has been sent to your email.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email || "your email"}</span>.
            Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}
            {resendMessage && (
              <p className="text-sm text-blue-600">{resendMessage}</p>
            )}

            <div className="space-y-2">
              <label htmlFor="otp-code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Didn't receive a code?
              </p>
              <Button
                type="button"
                variant="link"
                className="text-sm h-auto p-0"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Resend code"}
              </Button>
            </div>

            <div className="text-center">
              <a href="/login" className="text-sm text-primary hover:underline">
                Back to login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
