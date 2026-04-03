import { useState } from "react";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card.js";

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
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome to DevCentral</CardTitle>
          <CardDescription>
            Sign in to access your developer workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t p-4 mt-2">
          Don't have an account?{" "}
          <Button variant="link" asChild>
            <a href="/register" className="text-primary hover:underline">
              Register here
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
