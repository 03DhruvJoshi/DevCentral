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
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";

import { useNavigate } from "react-router-dom";
import GitOpsPRs from "./components/GitOpsPRs.js";
import GitOpsActions from "./components/GitOpsActions.js";
import GitOpsReleases from "./components/GitOpsReleases.js";
import GitOpsCommits from "./components/GitOpsCommits.js";
import GitOpsIssues from "./components/GitOpsIssues.js";
import GitOpsDeployments from "./components/GitOpsDeployments.js";
import RepositoryHealthCard from "./components/RepositoryHealthCard.js";
import SecurityChecks from "./components/SecurityChecks.js";
import CodeQualityChecks from "./components/CodeQualityChecks.js";
import DeploymentReadinessChecks from "./components/DeploymentReadinessChecks.js";
import TeamOwnershipChecks from "./components/TeamOwnershipChecks.js";
import QuickFixActions from "./components/QuickFixActions.js";
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

  useEffect(() => {
    const tokenCheck = localStorage.getItem("devcentral_token");
    if (!tokenCheck) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!selectedRepo) {
      setHealth(null);
      return;
    }

    const repo = selectedRepo;

    async function fetchHealth() {
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
      }
    }

    fetchHealth();
  }, [selectedRepo]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitOps & CI/CD</h1>
          <p className="text-muted-foreground mt-1">
            Manage your repositories, deployments, and operational health.
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3 border-green-200 bg-green-50 text-green-700"
        >
          <GitBranch className="h-4 w-4" />
          <span className="font-medium">GitHub Connected</span>
          <span className="h-2 w-2 rounded-full ml-1 bg-green-500 animate-pulse" />
        </Badge>
      </div>

      {/* ── Repository Selector ── */}
      <GitOpsRepos
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        /* ── Three top-level section tabs ── */
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="h-11 grid w-full max-w-lg grid-cols-3 mb-2">
            <TabsTrigger value="health" className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Repository Health
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="deployments" className="flex items-center gap-1.5">
              <Rocket className="h-4 w-4" />
              Deployments
            </TabsTrigger>
          </TabsList>

          {/* ══════════ TAB 1 — REPOSITORY HEALTH ══════════ */}
          <TabsContent value="health" className="mt-4 space-y-4">
            <RepositoryHealthCard selectedRepo={selectedRepo} />

            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SecurityChecks health={health} />
                <CodeQualityChecks health={health} />
                <DeploymentReadinessChecks health={health} />
                <TeamOwnershipChecks health={health} />
              </div>
            )}

            {health && (
              <QuickFixActions selectedRepo={selectedRepo} health={health} />
            )}
          </TabsContent>

          {/* ══════════ TAB 2 — ACTIVITY ══════════ */}
          <TabsContent value="activity" className="mt-4">
            <Tabs defaultValue="prs" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-lg mb-4">
                <TabsTrigger
                  value="prs"
                  className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Pull Requests
                </TabsTrigger>
                <TabsTrigger
                  value="pipelines"
                  className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Workflow className="h-3.5 w-3.5" />
                  CI/CD Pipelines
                </TabsTrigger>
                <TabsTrigger
                  value="releases"
                  className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Releases
                </TabsTrigger>
                <TabsTrigger
                  value="commits"
                  className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  Recent Commits
                </TabsTrigger>
                <TabsTrigger
                  value="issues"
                  className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  GitHub Issues
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
        <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
          Select a repository above to view health assessment, deployment
          controls, and project activity.
        </div>
      )}
    </div>
  );
}
