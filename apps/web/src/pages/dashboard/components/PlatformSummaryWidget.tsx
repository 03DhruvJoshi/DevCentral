import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  AlertCircle,
  GitPullRequest,
  Rocket,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { API_BASE_URL } from "../types.js";
import { useDashboardContext } from "../DashboardContext.js";

type Repo = {
  id: number;
  name: string;
  owner: string;
  url: string;
};

type GitHubIssue = {
  id: number;
  pull_request?: unknown;
  state: string;
};

type GitHubPR = {
  id: number;
  state: string;
};

type Deployment = {
  id: number;
  created_at: string;
  environment: string;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend: string;
  trendColor?: string;
};

function StatCard({
  icon,
  label,
  value,
  trend,
  trendColor = "text-slate-650",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 flex flex-col gap-1 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-1.5">
        <span className="text-indigo-500">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className={`text-xs ${trendColor}`}>{trend}</p>
    </div>
  );
}

export function PlatformSummaryWidget() {
  const { dateRange } = useDashboardContext();
  const days = dateRange.replace("d", "");

  const [repoCount, setRepoCount] = useState<number>(0);
  const [openIssues, setOpenIssues] = useState<number>(0);
  const [openPRs, setOpenPRs] = useState<number>(0);
  const [deploymentsToday, setDeploymentsToday] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("devcentral_token");
        const headers = { Authorization: `Bearer ${token}` };

        const reposRes = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers,
        });
        if (!reposRes.ok) throw new Error("Failed to load repositories");
        const repos = (await reposRes.json()) as Repo[];
        setRepoCount(repos.length);

        const primary = repos[0];
        if (!primary) {
          setIsLoading(false);
          return;
        }

        const [issuesRes, prsRes, deploymentsRes] = await Promise.allSettled([
          fetch(
            `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/issues?days=${days}`,
            { headers },
          ),
          fetch(
            `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/pulls`,
            { headers },
          ),
          fetch(
            `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/deployments`,
            { headers },
          ),
        ]);

        if (issuesRes.status === "fulfilled" && issuesRes.value.ok) {
          const issuesData = (await issuesRes.value.json()) as GitHubIssue[];
          const issues = issuesData.filter(
            (i) => !i.pull_request && i.state === "open",
          );
          setOpenIssues(issues.length);
        }

        if (prsRes.status === "fulfilled" && prsRes.value.ok) {
          const prsData = (await prsRes.value.json()) as GitHubPR[];
          const openPRList = Array.isArray(prsData)
            ? prsData.filter((p) => p.state === "open")
            : [];
          setOpenPRs(openPRList.length);
        }

        if (deploymentsRes.status === "fulfilled" && deploymentsRes.value.ok) {
          const raw = await deploymentsRes.value.json();
          const deploys: Deployment[] = Array.isArray(raw)
            ? raw
            : ((raw as { deployments?: Deployment[] }).deployments ?? []);
          const now = Date.now();
          const last24h = deploys.filter(
            (d) => now - new Date(d.created_at).getTime() < 86_400_000,
          );
          setDeploymentsToday(last24h.length);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [days]);

  return (
    <Card className="flex flex-col h-full border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-indigo-800 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" /> Platform Overview
          </CardTitle>
          <Badge
            variant="outline"
            className="border-indigo-300 text-indigo-700"
          >
            Last {days}d
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<GitBranch className="h-4 w-4" />}
              label="Total Repos"
              value={repoCount}
              trend="Connected repositories"
              trendColor="text-indigo-400"
            />
            <StatCard
              icon={<AlertCircle className="h-4 w-4" />}
              label="Open Issues"
              value={openIssues}
              trend={openIssues > 10 ? "Needs attention" : "Looking healthy"}
              trendColor={
                openIssues > 10 ? "text-amber-500" : "text-emerald-500"
              }
            />
            <StatCard
              icon={<GitPullRequest className="h-4 w-4" />}
              label="Open PRs"
              value={openPRs}
              trend={openPRs > 5 ? "Review queue building" : "Under control"}
              trendColor={openPRs > 5 ? "text-amber-500" : "text-emerald-500"}
            />
            <StatCard
              icon={<Rocket className="h-4 w-4" />}
              label="Deploys Today"
              value={deploymentsToday}
              trend={
                deploymentsToday > 0 ? "Active deployment" : "No deploys yet"
              }
              trendColor={
                deploymentsToday > 0 ? "text-sky-500" : "text-slate-650"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
