import { useState, useEffect } from "react";
import {
  GitPullRequest,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Workflow,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";
import { Badge } from "../../../components/ui/badge.js";
import { API_BASE_URL } from "../types.js";

type Repo = {
  id: number;
  name: string;
  owner: string;
  url: string;
};

type ActionRun = {
  id: number;
  conclusion: string | null;
  status: string | null;
  html_url: string;
  name: string | null;
};

type GitHubPR = {
  id: number;
  state: string;
  html_url?: string;
};

function CIStatusIcon({ conclusion }: { conclusion: string | null }) {
  if (conclusion === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (conclusion === "failure")
    return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
}

function ciStatusColor(conclusion: string | null): string {
  if (conclusion === "success") return "border-l-emerald-400 bg-emerald-50/60 border-emerald-100";
  if (conclusion === "failure") return "border-l-red-400 bg-red-50/60 border-red-100";
  return "border-l-amber-400 bg-amber-50/60 border-amber-100";
}

export function ActionsWidget() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [latestRun, setLatestRun] = useState<ActionRun | null>(null);
  const [openPRCount, setOpenPRCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGitOps = async () => {
      try {
        const token = localStorage.getItem("devcentral_token");
        const headers = { Authorization: `Bearer ${token}` };

        const reposRes = await fetch(`${API_BASE_URL}/api/github/repos`, { headers });
        if (!reposRes.ok) throw new Error("Failed to load repositories");

        const repoData = (await reposRes.json()) as Repo[];
        setRepos(repoData);

        const primary = repoData[0];
        if (!primary) return;

        const [actionsRes, prsRes] = await Promise.allSettled([
          fetch(
            `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/actions`,
            { headers },
          ),
          fetch(
            `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/pulls`,
            { headers },
          ),
        ]);

        if (actionsRes.status === "fulfilled" && actionsRes.value.ok) {
          const actionsData = (await actionsRes.value.json()) as {
            workflow_runs?: ActionRun[];
          };
          setLatestRun(actionsData.workflow_runs?.[0] ?? null);
        }

        if (prsRes.status === "fulfilled" && prsRes.value.ok) {
          const prsData = (await prsRes.value.json()) as GitHubPR[];
          const open = Array.isArray(prsData)
            ? prsData.filter((p) => p.state === "open").length
            : 0;
          setOpenPRCount(open);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGitOps();
  }, []);

  const primaryRepo = repos[0];

  return (
    <Card className="flex flex-col h-full border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between text-orange-800">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Action Center
          </span>
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            {repos.length} repos
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin h-5 w-5 text-orange-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* CI Status Card */}
            <button
              type="button"
              onClick={() => {
                if (latestRun?.html_url) globalThis.open(latestRun.html_url, "_blank");
              }}
              className={`w-full text-left rounded-xl border-l-4 border p-3 flex items-start justify-between gap-3 hover:shadow-sm transition-all ${ciStatusColor(latestRun?.conclusion ?? null)}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CIStatusIcon conclusion={latestRun?.conclusion ?? null} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    CI Status
                  </p>
                  <p className="text-sm text-slate-800 font-medium truncate mt-0.5">
                    {latestRun?.name ?? "No runs found"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant="outline"
                  className={
                    latestRun?.conclusion === "success"
                      ? "border-emerald-300 text-emerald-700 text-xs"
                      : latestRun?.conclusion === "failure"
                        ? "border-red-300 text-red-700 text-xs"
                        : "border-amber-300 text-amber-700 text-xs"
                  }
                >
                  {latestRun?.conclusion ?? latestRun?.status ?? "pending"}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>

            {/* Open PRs Card */}
            <button
              type="button"
              onClick={() => {
                const repoUrl = primaryRepo?.url;
                if (repoUrl) globalThis.open(`${repoUrl}/pulls`, "_blank");
              }}
              className="w-full text-left rounded-xl border-l-4 border-l-indigo-400 border border-indigo-100 bg-indigo-50/60 p-3 flex items-center justify-between gap-3 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5">
                <GitPullRequest className="h-4 w-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Open PRs
                  </p>
                  <p className="text-sm text-slate-800 font-medium">
                    {openPRCount} pull request{openPRCount !== 1 ? "s" : ""} awaiting review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {openPRCount > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                    {openPRCount}
                  </Badge>
                )}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>

            {/* Security / Quality Gate */}
            <button
              type="button"
              onClick={() => globalThis.open("https://sonarcloud.io", "_blank")}
              className="w-full text-left rounded-xl border-l-4 border-l-yellow-400 border border-yellow-100 bg-yellow-50/60 p-3 flex items-center justify-between gap-3 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Security
                  </p>
                  <p className="text-sm text-slate-800 font-medium">
                    SonarCloud Quality Gate
                  </p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>

            {/* View All link */}
            {primaryRepo && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-orange-700 hover:text-orange-800 hover:bg-orange-50 mt-1 gap-1"
                onClick={() => globalThis.open(primaryRepo.url, "_blank")}
              >
                <Workflow className="h-3.5 w-3.5" />
                View all workflows
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
