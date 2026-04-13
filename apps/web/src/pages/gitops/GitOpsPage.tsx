// apps/web/src/pages/gitops/GitOpsPage.tsx

import { useEffect, useState } from "react";
import {
  GitBranch,
  ShieldCheck,
  Activity,
  GitPullRequest,
  Workflow,
  Tag,
  GitCommit,
  CircleDot,
  Rocket,
  Terminal,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";

import { useNavigate } from "react-router-dom";
import GitOpsPRs from "./components/activity/GitOpsPRs.js";
import GitOpsActions from "./components/activity/GitOpsActions.js";
import GitOpsReleases from "./components/activity/GitOpsReleases.js";
import GitOpsCommits from "./components/activity/GitOpsCommits.js";
import GitOpsIssues from "./components/activity/GitOpsIssues.js";
import GitOpsDeployments from "./components/GitOpsDeployments.js";
import RepositoryHealthCard from "./components/health/RepositoryHealthCard.js";
import SecurityChecks from "./components/health/SecurityChecks.js";
import CodeQualityChecks from "./components/health/CodeQualityChecks.js";
import DeploymentReadinessChecks from "./components/health/DeploymentReadinessChecks.js";
import TeamOwnershipChecks from "./components/health/TeamOwnershipChecks.js";
import QuickFixActions from "./components/health/QuickFixActions.js";
import {
  type Repository,
  type HealthCheckResult,
  API_BASE_URL,
  token,
} from "./components/types.js";
import GitOpsRepos from "./components/GitOpsRepos.js";

export function GitOpsPage() {
  const navigate = useNavigate();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  useEffect(() => {
    const tokenCheck = localStorage.getItem("devcentral_token");
    if (!tokenCheck) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!selectedRepo) {
      setHealth(null);
      setIsHealthLoading(false);
      return;
    }

    const repo = selectedRepo;

    async function fetchHealth() {
      setIsHealthLoading(true);
      try {
        const url = `${API_BASE_URL}/api/gitops/repos/${repo.owner}/${repo.name}/health`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch health");
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        console.error("Health fetch error:", err);
        setHealth(null);
      } finally {
        setIsHealthLoading(false);
      }
    }

    fetchHealth();
  }, [selectedRepo]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(148,163,184,0.12),transparent)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-800/20 shadow-sm">
              <Terminal className="h-5 w-5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                GitOps Control Plane
              </h1>
              <p className="text-slate-600 text-sm mt-0.5">
                Repository health · Deployment pipeline · CI/CD activity
              </p>
            </div>
          </div>
          {selectedRepo && (
            <Badge className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>

              <span className="font-medium">GitHub Connected</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ── Repository Selector ── */}
      <GitOpsRepos
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        /* ── Three top-level section tabs ── */
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid h-full w-full grid-cols-3 rounded-lg border border-slate-200 bg-slate-100  ">
            <TabsTrigger
              value="health"
              className="flex items-center   rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex items-center   rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="deployments"
              className="flex items-center   rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              <Rocket className="h-4 w-4" />
              Deployments
            </TabsTrigger>
          </TabsList>

          {/* ══════════ TAB 1 — REPOSITORY HEALTH ══════════ */}
          <TabsContent value="health" className="mt-4 space-y-4">
            <RepositoryHealthCard selectedRepo={selectedRepo} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SecurityChecks health={health} isLoading={isHealthLoading} />
              <CodeQualityChecks health={health} isLoading={isHealthLoading} />
              <DeploymentReadinessChecks
                health={health}
                isLoading={isHealthLoading}
              />
              <TeamOwnershipChecks
                health={health}
                isLoading={isHealthLoading}
              />
            </div>

            <QuickFixActions
              selectedRepo={selectedRepo}
              health={health}
              isLoading={isHealthLoading}
            />
          </TabsContent>

          {/* ══════════ TAB 2 — ACTIVITY ══════════ */}
          <TabsContent value="activity" className="mt-4">
            <Tabs defaultValue="prs" className="w-full">
              <TabsList className="mb-4 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <TabsTrigger
                  value="prs"
                  className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Pull Requests
                </TabsTrigger>
                <TabsTrigger
                  value="pipelines"
                  className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                >
                  <Workflow className="h-3.5 w-3.5" />
                  CI/CD Pipelines
                </TabsTrigger>
                <TabsTrigger
                  value="releases"
                  className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Releases
                </TabsTrigger>
                <TabsTrigger
                  value="commits"
                  className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  Commits
                </TabsTrigger>
                <TabsTrigger
                  value="issues"
                  className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  Issues
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prs">
                <GitOpsPRs selectedRepo={selectedRepo} />
              </TabsContent>
              <TabsContent value="pipelines">
                <GitOpsActions selectedRepo={selectedRepo} />
              </TabsContent>
              <TabsContent value="releases">
                <GitOpsReleases selectedRepo={selectedRepo} />
              </TabsContent>
              <TabsContent value="commits">
                <GitOpsCommits selectedRepo={selectedRepo} />
              </TabsContent>
              <TabsContent value="issues">
                <GitOpsIssues selectedRepo={selectedRepo} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ══════════ TAB 3 — DEPLOYMENTS ══════════ */}
          <TabsContent value="deployments" className="mt-4">
            <GitOpsDeployments selectedRepo={selectedRepo} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 gap-3 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <GitBranch className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              No repository selected
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Select a repository above to view health, deployment controls, and
              activity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
