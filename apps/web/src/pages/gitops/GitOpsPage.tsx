// apps/web/src/features/gitops/GitOpsPage.tsx

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";

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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitOps & CI/CD</h1>
          <p className="text-muted-foreground mt-1">
            Manage your repositories, deployments, and operational health.
          </p>
        </div>

        {/* Connection Badge */}
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3 border-green-200 bg-green-50 text-green-700"
        >
          <GitBranch className="h-4 w-4" />
          <span className="font-medium">GitHub Connected</span>
          <span className="h-2 w-2 rounded-full ml-1 bg-green-500 animate-pulse" />
        </Badge>
      </div>

      <GitOpsRepos
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        <>
          {/* ===== HEALTH DASHBOARD SECTION ===== */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Repository Health</h2>

            {/* Main Health Card */}
            <RepositoryHealthCard selectedRepo={selectedRepo} />

            {/* Health Details - 4 Grid */}
            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SecurityChecks health={health} />
                <CodeQualityChecks health={health} />
                <DeploymentReadinessChecks health={health} />
                <TeamOwnershipChecks health={health} />
              </div>
            )}

            {/* Quick Fix Actions */}
            {health && (
              <QuickFixActions selectedRepo={selectedRepo} health={health} />
            )}
          </div>

          {/* ===== OPERATIONAL TABS SECTION ===== */}
          <Tabs defaultValue="prs" className="w-full">
            <TabsList className="grid w-auto max-w-4xl grid-cols-4">
              <TabsTrigger value="prs">Pull Requests</TabsTrigger>
              <TabsTrigger value="pipelines">CI/CD Pipelines</TabsTrigger>
              <TabsTrigger value="releases">Releases</TabsTrigger>
              <TabsTrigger value="commits">Recent Commits</TabsTrigger>
            </TabsList>

            {/* === TAB 1: PULL REQUESTS === */}
            <TabsContent value="prs" className="mt-6">
              <GitOpsPRs selectedRepo={selectedRepo} />
            </TabsContent>

            {/* === TAB 2: CI/CD PIPELINES === */}
            <TabsContent value="pipelines" className="mt-6">
              <GitOpsActions selectedRepo={selectedRepo} />
            </TabsContent>

            {/* === TAB 3: RELEASES === */}
            <TabsContent value="releases" className="mt-6">
              <GitOpsReleases selectedRepo={selectedRepo} />
            </TabsContent>

            {/* === TAB 4: COMMITS === */}
            <TabsContent value="commits" className="mt-6">
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Recent commits feature coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
          Select a repository above to view health assessment, deployment
          controls, and project activity.
        </div>
      )}
    </div>
  );
}
