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

export function ResetPasswordPage() {
  const token = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("token") ?? "";
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to reset password");
      }

      setSuccess(
        data.message ?? "Password reset successful. You can now log in.",
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const text =
        err instanceof Error ? err.message : "Failed to reset password";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Set a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}

            <div className="space-y-2">
              <label htmlFor="reset-password" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reset-confirm-password"
                className="text-sm font-medium"
              >
                Confirm New Password
              </label>
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>

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
