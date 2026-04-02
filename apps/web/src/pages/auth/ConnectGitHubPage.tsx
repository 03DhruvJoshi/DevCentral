import { useEffect, useState } from "react";
import { GitBranch, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button.js";
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

export function ConnectGitHubPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRedirecting) return;

    const redirectTimeout = globalThis.setTimeout(() => {
      globalThis.location.href = "/dashboard";
    }, 1000);

    return () => {
      globalThis.clearTimeout(redirectTimeout);
    };
  }, [isRedirecting]);

  const handleConnect = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/auth/github/begin-connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "Failed to start GitHub connect");

      const popup = window.open(
        data.authUrl,
        "github-oauth",
        "width=600,height=700,left=200,top=100",
      );

      const onMessage = async (event: MessageEvent) => {
        if (event.data === "github-oauth-success") {
          window.removeEventListener("message", onMessage);
          popup?.close();

          // Refresh the JWT so it carries the real githubUsername
          const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            localStorage.setItem("devcentral_token", refreshData.token);
            localStorage.setItem(
              "devcentral_user",
              JSON.stringify(refreshData.user),
            );
            setGithubUsername(refreshData.user?.githubUsername ?? null);
          }

          setConnected(true);
          setIsRedirecting(true);
          setIsConnecting(false);
        }
      };
      window.addEventListener("message", onMessage);

      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          window.removeEventListener("message", onMessage);
          setIsConnecting(false);
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-[480px]">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-gray-900 p-4">
              <GitBranch className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Connect your GitHub account
          </CardTitle>
          <CardDescription className="text-base mt-1">
            DevCentral uses your GitHub account to generate boilerplates
            directly into your own repositories.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {connected ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-2 text-emerald-700 text-lg font-medium">
                <CheckCircle2 className="h-6 w-6" />
                Connected as @{githubUsername}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You're all set! The Scaffolder will now generate boilerplates
                directly into your GitHub repositories.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                redirecting to dashboard...
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">How it works</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    Click the button below to open GitHub's authorization page
                  </li>
                  <li>
                    Make sure you are{" "}
                    <span className="font-semibold text-foreground">
                      signed into GitHub as your own account
                    </span>{" "}
                    in the popup
                  </li>
                  <li>Click "Authorize DevCentral" on the GitHub page</li>
                  <li>The popup will close automatically and you're done</li>
                </ul>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => void handleConnect()}
                disabled={isConnecting}
              >
                <GitBranch className="h-5 w-5" />
                {isConnecting ? "Waiting for GitHub…" : "Authorize with GitHub"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
