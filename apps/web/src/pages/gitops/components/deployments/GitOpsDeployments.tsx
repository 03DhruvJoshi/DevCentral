import { useState, useEffect } from "react";
import { Rocket, Layers } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs.js";

import {
  type Repository,
  type GitHubDeployment,
  type GitHubEnvironment,
  type GitHubWorkflow,
  type DeploymentServiceAvailabilityResponse,
  token,
  API_BASE_URL,
} from "../types.js";

import { buildServices } from "./utilities.js";

import type { ServiceDef } from "./types.js";

import EnvironmentsTab from "./tabs/EnvironmentsTab.js";
import ManualDeploymentTab from "./tabs/ManualDeploymentTab.js";
import SetupGuideDialog from "./tabs/SetupGuideDialog.js";

// ── Shared deploy-target picker (branch dropdown or commit dropdown) ──────────

// ── Main Component ────────────────────────────────────────────────────────────

export default function GitOpsDeployments(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;

  // Environments & deployments
  const [environments, setEnvironments] = useState<GitHubEnvironment[]>([]);
  const [deployments, setDeployments] = useState<GitHubDeployment[]>([]);
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  // Workflows list
  const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);

  // Manual deploy panel state
  const [deployService, setDeployService] = useState<
    "github-actions" | "vercel" | "render"
  >("github-actions");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [deployMode, setDeployMode] = useState<"latest" | "specific">("latest");
  const [deployBranch, setDeployBranch] = useState("main");
  const [deployCommitSha, setDeployCommitSha] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Guide dialog
  const [guideService, setGuideService] = useState<ServiceDef | null>(null);

  // Real-time service availability (GitHub Actions, Vercel, Render)
  const [serviceAvailability, setServiceAvailability] =
    useState<DeploymentServiceAvailabilityResponse | null>(null);

  // Derived services list — updates whenever availability data arrives
  const services = buildServices(serviceAvailability);

  // Branches + commits for dropdowns
  const [branches, setBranches] = useState<string[]>([]);
  const [recentCommits, setRecentCommits] = useState<
    Array<{ sha: string; message: string; author: string }>
  >([]);

  // Workflow setup (PR creation)
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [setupMsg, setSetupMsg] = useState<{
    type: "success" | "error";
    text: string;
    prUrl?: string;
  } | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRepo) return;

    setSelectedWorkflow("");
    setDeployMode("latest");
    setDeployBranch("main");
    setDeployCommitSha("");
    setDispatchMsg(null);
    setServiceAvailability(null);
    setBranches([]);
    setRecentCommits([]);
    setSetupMsg(null);

    async function fetchAll() {
      setIsEnvLoading(true);
      try {
        const base = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}`;
        const headers = { Authorization: `Bearer ${token}` };

        const [envRes, depRes, wfRes, svcRes, branchRes, commitRes] =
          await Promise.all([
            fetch(`${base}/environments`, { headers }),
            fetch(`${base}/deployments?per_page=50`, { headers }),
            fetch(`${base}/workflows`, { headers }),
            fetch(`${base}/deployment-services`, { headers }),
            fetch(`${base}/branches?per_page=50`, { headers }),
            fetch(`${base}/commits?per_page=10`, { headers }),
          ]);

        if (envRes.ok) setEnvironments(await envRes.json());
        if (depRes.ok) setDeployments(await depRes.json());
        if (wfRes.ok) {
          const wfs: GitHubWorkflow[] = await wfRes.json();
          setWorkflows(wfs.filter((w) => w.state === "active"));
        }
        if (branchRes.ok) setBranches(await branchRes.json());
        if (commitRes.ok) {
          const rawCommits: Array<{
            sha?: string;
            commit?: { message?: string; author?: { name?: string } };
            author?: { login?: string } | null;
          }> = await commitRes.json();
          setRecentCommits(
            rawCommits.map((c) => {
              const [firstLine = "No commit message"] = (
                c.commit?.message ?? "No commit message"
              ).split("\n");

              return {
                sha: c.sha ?? "",
                message: firstLine.slice(0, 72),
                author: c.author?.login ?? c.commit?.author?.name ?? "unknown",
              };
            }),
          );
        }
        if (svcRes.ok) {
          setServiceAvailability(await svcRes.json());
        }
      } catch (err) {
        console.error("Deployments fetch error:", err);
      } finally {
        setIsEnvLoading(false);
      }
    }

    fetchAll();
  }, [selectedRepo]);

  // ── Detect provider-specific workflows from the list ───────────────────────
  const vercelWorkflow = workflows.find(
    (w) =>
      w.name.toLowerCase().includes("vercel") ||
      w.path.toLowerCase().includes("vercel"),
  );
  const renderWorkflow = workflows.find(
    (w) =>
      w.name.toLowerCase().includes("render") ||
      w.path.toLowerCase().includes("render"),
  );

  // ── Create a PR with the workflow YAML file for the chosen provider ─────────
  async function createWorkflowPr(service: "vercel" | "render") {
    setIsCreatingPr(true);
    setSetupMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gitops/setup/workflow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          service,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create PR");
      setSetupMsg({
        type: "success",
        text: "PR created! Merge it after adding the required secrets.",
        prUrl: data.prUrl,
      });
    } catch (err: any) {
      setSetupMsg({ type: "error", text: err.message });
    } finally {
      setIsCreatingPr(false);
    }
  }

  // ── Manual deploy — GitHub Actions dispatch (all three services go via GH) ──
  async function handleDeploy() {
    setIsDispatching(true);
    setDispatchMsg(null);
    try {
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Resolve which workflow ID to use
      let workflowId: string;
      if (deployService === "github-actions") {
        if (!selectedWorkflow) throw new Error("Please select a workflow.");
        workflowId = selectedWorkflow;
      } else if (deployService === "vercel") {
        if (!vercelWorkflow)
          throw new Error(
            "No Vercel workflow found. Create the PR first and merge it.",
          );
        workflowId = String(vercelWorkflow.id);
      } else {
        if (!renderWorkflow)
          throw new Error(
            "No Render workflow found. Create the PR first and merge it.",
          );
        workflowId = String(renderWorkflow.id);
      }

      const ref =
        deployMode === "specific"
          ? deployCommitSha.trim()
          : deployBranch.trim() || "main";
      if (!ref)
        throw new Error(
          deployMode === "specific"
            ? "Please select a commit."
            : "Please select a branch.",
        );

      const res = await fetch(
        `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/workflows/${workflowId}/dispatch`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ ref }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Workflow dispatch failed");
      setDispatchMsg({ type: "success", text: data.message });
    } catch (err: any) {
      setDispatchMsg({ type: "error", text: err.message });
    } finally {
      setIsDispatching(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Tabs defaultValue="environments" className="w-full">
        <TabsList className="mb-2 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
          <TabsTrigger
            value="environments"
            className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            Environments
          </TabsTrigger>
          <TabsTrigger
            value="manual-deployment"
            className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
          >
            <Rocket className="h-3.5 w-3.5" />
            Manual Deployment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="mt-4 space-y-6">
          <EnvironmentsTab
            selectedRepo={selectedRepo}
            environments={environments}
            setEnvironments={setEnvironments}
            isEnvLoading={isEnvLoading}
            setIsEnvLoading={setIsEnvLoading}
            deployments={deployments}
            services={services}
            setGuideService={setGuideService}
          />
        </TabsContent>

        <TabsContent value="manual-deployment" className="mt-4">
          <ManualDeploymentTab
            selectedRepo={selectedRepo}
            deployService={deployService}
            setDeployService={setDeployService}
            selectedWorkflow={selectedWorkflow}
            setSelectedWorkflow={setSelectedWorkflow}
            deployMode={deployMode}
            setDeployMode={setDeployMode}
            deployBranch={deployBranch}
            setDeployBranch={setDeployBranch}
            deployCommitSha={deployCommitSha}
            setDeployCommitSha={setDeployCommitSha}
            vercelWorkflow={vercelWorkflow}
            renderWorkflow={renderWorkflow}
            isCreatingPr={isCreatingPr}
            setupMsg={setupMsg}
            createWorkflowPr={createWorkflowPr}
            handleDeploy={handleDeploy}
            isDispatching={isDispatching}
            dispatchMsg={dispatchMsg}
            setDispatchMsg={setDispatchMsg}
            branches={branches}
            recentCommits={recentCommits}
            workflows={workflows}
          />
        </TabsContent>
      </Tabs>

      <SetupGuideDialog
        guideService={guideService}
        setGuideService={setGuideService}
      />
    </div>
  );
}
