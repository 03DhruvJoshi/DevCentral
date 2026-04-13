import { useEffect, useState } from "react";
import {
  Github,
  CheckCircle2,
  Loader2,
  Layers,
  Shield,
  Zap,
  FolderGit2,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/button.js";

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
          {connected ? (
            /* ── Success State ── */
            <div className="px-8 py-12 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                  GitHub Connected!
                </h2>
                {githubUsername && (
                  <p className="text-sm text-slate-500 mt-1">
                    Signed in as{" "}
                    <span className="font-semibold text-slate-700">
                      @{githubUsername}
                    </span>
                  </p>
                )}
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                The Scaffolder will now push boilerplates directly into your
                GitHub repositories.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-650 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to your dashboard…
              </div>
            </div>
          ) : (
            /* ── Connect State ── */
            <>
              {/* Header */}
              <div className="px-8 pt-8 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                    <Github className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                      Connect GitHub
                    </h1>
                    <p className="text-xs text-slate-650">Final setup step</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  DevCentral uses your GitHub account to push scaffolded
                  boilerplates directly into your repositories.
                </p>
              </div>

              {/* Perks list */}
              <div className="px-8 pb-6">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 divide-y divide-slate-100 overflow-hidden mb-5">
                  {[
                    {
                      icon: <FolderGit2 className="w-4 h-4 text-blue-500" />,
                      label: "Push templates to your repos",
                      sub: "Create or update repos directly from blueprints",
                    },
                    {
                      icon: <Zap className="w-4 h-4 text-amber-500" />,
                      label: "One-click scaffold execution",
                      sub: "Files are committed via the GitHub API instantly",
                    },
                    {
                      icon: <Shield className="w-4 h-4 text-emerald-500" />,
                      label: "Read-only account info only",
                      sub: "We only request repository write permissions",
                    },
                  ].map(({ icon, label, sub }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <div className="mt-0.5 shrink-0">{icon}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {label}
                        </p>
                        <p className="text-xs text-slate-650 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-4">
                    <span className="font-medium">Error:</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium gap-2.5 transition-all group"
                  size="default"
                  onClick={() => void handleConnect()}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for GitHub…
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4" />
                      Authorize with GitHub
                      <ArrowRight className="h-4 w-4 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-slate-650 mt-3">
                  A popup will open — make sure pop-ups are allowed for this
                  site.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {["Account", "Verify", "GitHub"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 2
                      ? "bg-blue-600 text-white"
                      : connected
                        ? "bg-emerald-500 text-white"
                        : "bg-blue-600 text-white"
                  }`}
                >
                  {i < 2 ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i === 2 ? "text-slate-700" : "text-slate-650"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < 2 && <div className="w-6 h-px bg-slate-300" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
