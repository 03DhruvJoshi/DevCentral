import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  Github,
  GitBranch,
  Link2,
  Loader2,
  Shield,
  Unplug,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Button } from "../../../../components/ui/button.js";
import { Badge } from "../../../../components/ui/badge.js";
import { API_BASE_URL } from "../../../admin/types.js";
import type { SettingsUser } from "../../types.js";
import { getAuthToken, persistUser, refreshSessionUser } from "../../utils.js";

type IntegrationsSectionProps = {
  user: SettingsUser;
  onUserUpdate: (next: SettingsUser) => void;
};

function resolveGithubUsername(source: SettingsUser): string | null {
  const value = source.githubUsername;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function IntegrationsSection({
  user,
  onUserUpdate,
}: IntegrationsSectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(
    resolveGithubUsername(user),
  );

  useEffect(() => {
    setGithubUsername(resolveGithubUsername(user));
  }, [user.githubUsername]);

  const handleConnect = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/github/begin-connect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { authUrl?: string; error?: string };
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

          if (token) {
            const refreshed = await refreshSessionUser(token);
            if (refreshed) {
              const newUsername = resolveGithubUsername(refreshed);
              setGithubUsername(newUsername);
              onUserUpdate(refreshed);
            }
          }

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

  const handleRevoke = async () => {
    setIsRevoking(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/github/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const optimisticUser = { ...user, githubUsername: null };
        persistUser(optimisticUser);
        onUserUpdate(optimisticUser);

        if (token) {
          const refreshed = await refreshSessionUser(token);
          if (refreshed) {
            onUserUpdate(refreshed);
          }
        }

        setGithubUsername(null);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to revoke access.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Connected Applications
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Manage OAuth connections required for scaffolding and GitOps
                execution.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                <Github className="h-5 w-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">GitHub</p>
                  {githubUsername ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-100 text-xs font-medium">
                      Not Connected
                    </Badge>
                  )}
                </div>

                {githubUsername ? (
                  <p className="text-xs text-slate-400 mt-1">
                    Signed in as{" "}
                    <span className="font-semibold text-slate-700 font-mono">
                      @{githubUsername}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Connect your GitHub account to enable Scaffolder and GitOps
                    features.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { Icon: FolderGit2, label: "Repository Read/Write" },
                    { Icon: Zap, label: "GitHub Actions" },
                    { Icon: Shield, label: "Account Info" },
                  ].map(({ Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                {githubUsername ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                    disabled={isRevoking}
                    onClick={() => void handleRevoke()}
                  >
                    {isRevoking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Unplug className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
                    disabled={isConnecting}
                    onClick={() => void handleConnect()}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <GitBranch className="h-3.5 w-3.5" />
                        Connect
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Additional Integrations
          </CardTitle>
          <CardDescription className="text-xs">
            Planned integrations for enterprise source control providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center text-sm font-semibold">
                  Az
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Azure DevOps
                  </p>
                  <p className="text-xs text-slate-500">
                    Boards, Repos, Pipelines
                  </p>
                </div>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">
                Coming Soon
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="mt-4 h-8 border-slate-200 text-slate-500"
            >
              Connect
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[#fc6d26]/10 text-[#fc6d26] flex items-center justify-center">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">GitLab</p>
                  <p className="text-xs text-slate-500">
                    Projects, Merge Requests, CI
                  </p>
                </div>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">
                Coming Soon
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="mt-4 h-8 border-slate-200 text-slate-500"
            >
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
