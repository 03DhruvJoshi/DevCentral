import { useState, useEffect, useMemo } from "react";
import {
  Rocket,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  ExternalLink,
  Calendar,
  RefreshCw,
  Settings,
  Globe,
  Server,
  Cloud,
  AlertTriangle,
  Layers,
  CircleDot,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs.js";
import { TableControls, PaginationControls } from "./TableControls.js";
import {
  type Repository,
  type GitHubDeployment,
  type GitHubEnvironment,
  type GitHubWorkflow,
  type DeploymentServiceAvailabilityResponse,
  token,
  API_BASE_URL,
} from "./types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deploymentStatusBadge(env: string, deployments: GitHubDeployment[]) {
  const latest = deployments.find((d) => d.environment === env);
  if (!latest)
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>Never deployed</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span>Live</span>
    </span>
  );
}

// ── Service card definitions ──────────────────────────────────────────────────

interface ServiceDef {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "coming_soon";
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  guideTitle?: string;
  guideSteps?: string[];
}

// Builds the services list using real detection results for the three live
// services; AWS, GCP, and Azure remain static "coming_soon" entries.
function buildServices(
  availability: DeploymentServiceAvailabilityResponse | null,
): ServiceDef[] {
  const ghStatus = availability?.githubActions.status ?? "available";
  const vercelStatus = availability?.vercel.status ?? "available";
  const renderStatus = availability?.render.status ?? "available";

  return [
    {
      id: "github-actions",
      name: "GitHub Actions",
      status: ghStatus,
      icon: GitBranch,
      iconColor: "text-gray-700",
      iconBg: "bg-gray-100",
      description:
        ghStatus === "connected"
          ? "Active workflows detected in this repository. Select a workflow in the Deploy panel below to trigger a one-click deployment straight from DevCentral."
          : "No active workflows found. Create a workflow file with a workflow_dispatch trigger to enable one-click deployments from DevCentral.",
    },
    {
      id: "vercel",
      name: "Vercel",
      status: vercelStatus,
      icon: Globe,
      iconColor: "text-black",
      iconBg: "bg-slate-100",
      description:
        vercelStatus === "connected"
          ? "Vercel is actively deploying this repository. Deployment events are tracked automatically via GitHub Deployments — check the history below for the latest."
          : "Vercel automatically creates GitHub Deployment events on each push. Install the Vercel GitHub App on this repository to start tracking deployments here.",
      guideTitle: "Connect Vercel",
      guideSteps: [
        "Go to vercel.com → Settings → Git",
        "Install the Vercel GitHub App on your repository",
        "Vercel will now auto-create GitHub Deployments on each push",
        "Deployments will appear in the history table below automatically",
      ],
    },
    {
      id: "render",
      name: "Render",
      status: renderStatus,
      icon: Server,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      description:
        renderStatus === "connected"
          ? "Render is actively deploying this repository and posting GitHub Deployment events. Deployment history is tracked automatically below."
          : "Render creates GitHub Deployment events when it deploys your services. Connect this repository to Render to track deployments here.",
      guideTitle: "Connect Render",
      guideSteps: [
        "Go to render.com and open your Web Service dashboard",
        "Connect your GitHub account in Render if it is not already connected",
        "Select your repository and branch in Render service settings",
        "Install and authorize the Render GitHub integration/app for this repository",
        "Enable automatic deploys so Render tracks new commits and deployment activity",
      ],
    },
    {
      id: "aws",
      name: "AWS",
      description:
        "Deploy to ECS, Lambda, Elastic Beanstalk, or App Runner via GitHub Actions. Use aws-actions/configure-aws-credentials in your workflow.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
    },
    {
      id: "gcp",
      name: "Google Cloud",
      description:
        "Deploy to Cloud Run, App Engine, or GKE using google-github-actions/* in your deployment workflow.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      id: "azure",
      name: "Azure",
      description:
        "Deploy to App Service, Container Apps, or AKS using Azure/login and Azure/webapps-deploy GitHub Actions.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-sky-500",
      iconBg: "bg-sky-50",
    },
  ];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onGuide,
}: {
  service: ServiceDef;
  onGuide: (s: ServiceDef) => void;
}) {
  const Icon = service.icon;
  return (
    <Card className="flex flex-col border-slate-200 bg-white/95 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${service.iconBg}`}>
              <Icon className={`h-4 w-4 ${service.iconColor}`} />
            </div>
            <CardTitle className="text-sm font-semibold">
              {service.name}
            </CardTitle>
          </div>
          {service.status === "connected" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Connected</span>
            </span>
          ) : service.status === "coming_soon" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
              Soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              Available
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          {service.description}
        </p>
        {service.status === "available" && service.guideTitle && (
          <Button
            size="sm"
            variant="outline"
            className="w-fit text-xs border-slate-200 bg-white hover:bg-slate-50"
            onClick={() => onGuide(service)}
          >
            <Settings className="h-3 w-3 mr-1.5" />
            Setup Guide
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EnvironmentCard({
  env,
  deployments,
  index,
  total,
}: {
  env: GitHubEnvironment;
  deployments: GitHubDeployment[];
  index: number;
  total: number;
}) {
  const latest = deployments.find((d) => d.environment === env.name);
  const isLast = index === total - 1;

  // Give each stage a distinct accent — first = dev/staging, last = production
  const stageColor =
    index === 0
      ? "border-l-sky-300"
      : isLast
        ? "border-l-emerald-400"
        : "border-l-violet-300";

  return (
    <Card
      className={`w-full border-l-4 ${stageColor} border-slate-200 bg-white/95 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-sm capitalize text-slate-900">
              {env.name}
            </p>
            {env.protection_rules && env.protection_rules.length > 0 && (
              <p className="text-xs text-slate-500">
                Protected · {env.protection_rules.length} rule
                {env.protection_rules.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {latest ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <span>Idle</span>
            </span>
          )}
        </div>

        {latest ? (
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              <code className="font-mono text-slate-700">{latest.ref}</code>
            </div>
            {latest.creator && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4 ring-1 ring-slate-200">
                  <AvatarImage src={latest.creator.avatar_url} />
                  <AvatarFallback>{latest.creator.login[0]}</AvatarFallback>
                </Avatar>
                <span>{latest.creator.login}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {new Date(latest.created_at).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No deployments yet</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shared deploy-target picker (branch dropdown or commit dropdown) ──────────

interface DeployTargetPickerProps {
  deployMode: "latest" | "specific";
  setDeployMode: (v: "latest" | "specific") => void;
  deployBranch: string;
  setDeployBranch: (v: string) => void;
  deployCommitSha: string;
  setDeployCommitSha: (v: string) => void;
  branches: string[];
  recentCommits: Array<{ sha: string; message: string; author: string }>;
}

function DeployTargetPicker({
  deployMode,
  setDeployMode,
  deployBranch,
  setDeployBranch,
  deployCommitSha,
  setDeployCommitSha,
  branches,
  recentCommits,
}: DeployTargetPickerProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Deploy target</Label>
        <div className="flex gap-2">
          {(
            [
              { value: "latest", label: "Latest on branch" },
              { value: "specific", label: "Specific commit" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDeployMode(value)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                deployMode === value
                  ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {deployMode === "latest" ? (
        <div className="space-y-2">
          <Label>Branch</Label>
          {branches.length > 0 ? (
            <select
              value={deployBranch}
              onChange={(e) => setDeployBranch(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <GitBranch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 font-mono"
                placeholder="main"
                value={deployBranch}
                onChange={(e) => setDeployBranch(e.target.value)}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The workflow runs at the HEAD of this branch.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Commit</Label>
          {recentCommits.length > 0 ? (
            <select
              value={deployCommitSha}
              onChange={(e) => setDeployCommitSha(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            >
              {recentCommits.map((c) => (
                <option key={c.sha} value={c.sha}>
                  {c.message.split("\n")[0]} ({c.sha.slice(0, 7)}) by {c.author}
                </option>
              ))}
            </select>
          ) : (
            <Input
              className="font-mono"
              placeholder="e.g. a3f2c1d or full 40-char SHA"
              value={deployCommitSha}
              onChange={(e) => setDeployCommitSha(e.target.value)}
            />
          )}
          <p className="text-xs text-muted-foreground">
            The workflow will run at the exact commit SHA above.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Workflow setup guide (shown when no provider workflow is detected) ─────────

interface SecretItem {
  name: string;
  hint: string;
}

function WorkflowSetupGuide({
  service,
  owner,
  repo,
  isCreatingPr,
  setupMsg,
  onCreatePr,
  secrets,
}: {
  service: "vercel" | "render";
  owner: string;
  repo: string;
  isCreatingPr: boolean;
  setupMsg: { type: "success" | "error"; text: string; prUrl?: string } | null;
  onCreatePr: () => void;
  secrets: SecretItem[];
}) {
  const label = service === "vercel" ? "Vercel" : "Render";
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-4">
      <div className="space-y-1">
        <p className="font-medium text-sm">
          Connect {label} via GitHub Actions
        </p>
        <p className="text-xs text-muted-foreground">
          No {label} deployment workflow found in this repository. DevCentral
          can open a pull request that adds a ready-made workflow file. Once you
          merge it, you can trigger {label} deploys from here with a single
          click — no credentials stored in DevCentral.
        </p>

        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mt-4">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Important: Create a new <strong>"Repository secret"</strong> (not an
          "Environment secret") to ensure the workflow can access it without
          additional configuration.
        </div>
      </div>

      {/* Secrets checklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium">
          Required GitHub Secrets (add before merging the PR)
        </p>
        <div className="rounded-md border bg-muted/30 divide-y">
          {secrets.map((s) => (
            <div key={s.name} className="flex items-start gap-3 px-3 py-2">
              <code className="text-xs font-mono bg-background border rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                {s.name}
              </code>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {s.hint}
              </span>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white w-fit text-xs"
          asChild
        >
          <a
            href={`https://github.com/${owner}/${repo}/settings/secrets/actions`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open GitHub Secrets Settings
          </a>
        </Button>
      </div>

      {/* Create PR button + feedback */}
      <div className="space-y-2">
        <Button
          onClick={onCreatePr}
          disabled={isCreatingPr}
          size="sm"
          className="gap-1.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl hover:bg-blue-700 text-white"
        >
          {isCreatingPr ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {isCreatingPr
            ? "Creating PR..."
            : `Create PR with ${label} Deployment Workflow`}
        </Button>

        {setupMsg && (
          <div
            className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
              setupMsg.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {setupMsg.type === "error" ? (
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-1">
              <span>{setupMsg.text}</span>
              {setupMsg.prUrl && (
                <a
                  href={setupMsg.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View pull request on GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // History table
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

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
    setSearch("");
    setPage(1);
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

  // ── Filter deployment history ───────────────────────────────────────────────
  const filteredDeployments = useMemo(() => {
    return deployments.filter((d) => {
      const matchesSearch =
        search === "" ||
        d.environment.toLowerCase().includes(search.toLowerCase()) ||
        d.ref.toLowerCase().includes(search.toLowerCase()) ||
        (d.creator?.login ?? "").toLowerCase().includes(search.toLowerCase()) ||
        d.sha.startsWith(search);
      const matchesEnv = envFilter === "all" || d.environment === envFilter;
      return matchesSearch && matchesEnv;
    });
  }, [deployments, search, envFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeployments.length / rowsPerPage),
  );
  const paginated = filteredDeployments.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const uniqueEnvironments = Array.from(
    new Set(deployments.map((d) => d.environment)),
  );

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
          <TabsTrigger
            value="deployment-history"
            className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
          >
            <Clock className="h-3.5 w-3.5" />
            Deployment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="mt-4 space-y-6">
          {/* ── Environment Overview ── */}
          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2 text-slate-900">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Environments
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Re-fetch
                  setIsEnvLoading(true);
                  fetch(
                    `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/environments`,
                    { headers: { Authorization: `Bearer ${token}` } },
                  )
                    .then((r) => r.json())
                    .then(setEnvironments)
                    .finally(() => setIsEnvLoading(false));
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            </div>

            {isEnvLoading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading environments...
              </div>
            ) : environments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No GitHub Environments configured.</p>
                  <p className="text-xs mt-1">
                    Create environments in your repository Settings →
                    Environments, or connect Vercel/Render to auto-generate
                    them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full h-full">
                {environments.map((env, idx) => (
                  <div key={env.id} className="flex items-center flex-1 ">
                    <div className="flex-1">
                      <EnvironmentCard
                        env={env}
                        deployments={deployments}
                        index={idx}
                        total={environments.length}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2 text-slate-900">
                <CircleDot className="h-4 w-4 text-muted-foreground" />
                Deployment Services
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onGuide={setGuideService}
                />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="manual-deployment" className="mt-4">
          {/* ── Manual Deploy Card ── */}
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Rocket className="h-4 w-4 text-violet-600" />
                Manual Deployment
              </CardTitle>
              <CardDescription>
                Deploy <strong>{selectedRepo.name}</strong> to a specific
                service at the latest commit, a branch, or a specific commit
                SHA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* ── Service selector ── */}
              <div className="space-y-2">
                <Label>Deploy via</Label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      {
                        id: "github-actions",
                        label: "GitHub Actions",
                        icon: GitBranch,
                      },
                      { id: "vercel", label: "Vercel", icon: Globe },
                      { id: "render", label: "Render", icon: Server },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setDeployService(id);
                        setDispatchMsg(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        deployService === id
                          ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl text-white "
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── GitHub Actions fields ── */}
              {deployService === "github-actions" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Workflow</Label>
                    {workflows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No active workflows found. Add a workflow with a{" "}
                        <code>workflow_dispatch</code> trigger to enable manual
                        deployments.
                      </p>
                    ) : (
                      <select
                        value={selectedWorkflow}
                        onChange={(e) => setSelectedWorkflow(e.target.value)}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                      >
                        <option value="">Select a workflow</option>
                        {workflows.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <DeployTargetPicker
                    deployMode={deployMode}
                    setDeployMode={setDeployMode}
                    deployBranch={deployBranch}
                    setDeployBranch={setDeployBranch}
                    deployCommitSha={deployCommitSha}
                    setDeployCommitSha={setDeployCommitSha}
                    branches={branches}
                    recentCommits={recentCommits}
                  />
                </div>
              )}

              {/* ── Vercel via GitHub Actions ── */}
              {deployService === "vercel" &&
                (vercelWorkflow ? (
                  /* Workflow detected — show detected badge + branch/commit picker */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 p-2.5 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Workflow detected:{" "}
                        <strong>{vercelWorkflow.name}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-2 text-xs "
                        asChild
                      >
                        <a
                          href={vercelWorkflow.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                    {/* Reuse the same branch/commit UI */}
                    <DeployTargetPicker
                      deployMode={deployMode}
                      setDeployMode={setDeployMode}
                      deployBranch={deployBranch}
                      setDeployBranch={setDeployBranch}
                      deployCommitSha={deployCommitSha}
                      setDeployCommitSha={setDeployCommitSha}
                      branches={branches}
                      recentCommits={recentCommits}
                    />
                  </div>
                ) : (
                  /* No workflow found — show setup guide */
                  <WorkflowSetupGuide
                    service="vercel"
                    owner={selectedRepo.owner}
                    repo={selectedRepo.name}
                    isCreatingPr={isCreatingPr}
                    setupMsg={setupMsg}
                    onCreatePr={() => createWorkflowPr("vercel")}
                    secrets={[
                      {
                        name: "VERCEL_DEPLOY_HOOK_URL",
                        hint: "Vercel → your project → Settings → Git → Deploy Hooks → create a hook and copy the URL",
                      },
                    ]}
                  />
                ))}

              {/* ── Render via GitHub Actions ── */}
              {deployService === "render" &&
                (renderWorkflow ? (
                  /* Workflow detected — show detected badge + branch/commit picker */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 p-2.5 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        Workflow detected:{" "}
                        <strong>{renderWorkflow.name}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-2 text-xs"
                        asChild
                      >
                        <a
                          href={renderWorkflow.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                    <DeployTargetPicker
                      deployMode={deployMode}
                      setDeployMode={setDeployMode}
                      deployBranch={deployBranch}
                      setDeployBranch={setDeployBranch}
                      deployCommitSha={deployCommitSha}
                      setDeployCommitSha={setDeployCommitSha}
                      branches={branches}
                      recentCommits={recentCommits}
                    />
                  </div>
                ) : (
                  /* No workflow found — show setup guide */
                  <WorkflowSetupGuide
                    service="render"
                    owner={selectedRepo.owner}
                    repo={selectedRepo.name}
                    isCreatingPr={isCreatingPr}
                    setupMsg={setupMsg}
                    onCreatePr={() => createWorkflowPr("render")}
                    secrets={[
                      {
                        name: "RENDER_DEPLOY_HOOK_URL",
                        hint: "Render → your service → Settings → Deploy Hook → copy the URL",
                      },
                    ]}
                  />
                ))}

              {/* ── Warning + result + Deploy Now (hidden when setup guide is shown) ── */}
              {(deployService === "github-actions" ||
                (deployService === "vercel" && !!vercelWorkflow) ||
                (deployService === "render" && !!renderWorkflow)) && (
                <>
                  {/* Danger zone warning */}
                  <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-300 p-3 rounded-lg">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                      <strong>Live deployment:</strong> This will push{" "}
                      <strong>{selectedRepo.name}</strong> to production
                      infrastructure. Confirm the branch and target are correct
                      before proceeding.
                    </span>
                  </div>

                  {dispatchMsg && (
                    <div
                      className={`flex items-start gap-2 text-sm p-3 rounded-lg border ${
                        dispatchMsg.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {dispatchMsg.type === "success" ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Deployment triggered — monitor progress in GitHub
                          Actions.
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 shrink-0" />
                          Failed: {dispatchMsg.text}
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl hover:bg-blue-700 text-white border border-blue-600 shadow-sm"
                    disabled={isDispatching}
                    onClick={handleDeploy}
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Dispatching…
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy Now
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment-history" className="mt-4">
          {/* ── Deployment History ── */}
          <section>
            <h3 className="font-semibold text-base flex items-center gap-2 mb-3 text-slate-900">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Deployment History
            </h3>

            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="pt-4">
                <TableControls
                  search={search}
                  onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  searchPlaceholder="Search by environment, ref, or author..."
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={setRowsPerPage}
                  onPageChange={setPage}
                  extraFilters={
                    <select
                      value={envFilter}
                      onChange={(e) => {
                        setEnvFilter(e.target.value);
                        setPage(1);
                      }}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                    >
                      <option value="all">All Environments</option>
                      {uniqueEnvironments.map((env) => (
                        <option key={env} value={env}>
                          {env}
                        </option>
                      ))}
                    </select>
                  }
                />

                {isEnvLoading ? (
                  <div className="flex items-center gap-2 justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading deployments…
                  </div>
                ) : paginated.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-200">
                    <Rocket className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                      {deployments.length === 0
                        ? "No deployments found. Connect Vercel or Render, or trigger one above."
                        : "No results match your filters."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">
                            Environment
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">
                            Ref / SHA
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">
                            Deployed By
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">
                            Date
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((dep) => (
                          <tr
                            key={dep.id}
                            className="border-t border-slate-100 align-top hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                                {dep.environment}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                                  <code className="text-xs text-slate-700">
                                    {dep.ref}
                                  </code>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {dep.sha.slice(0, 7)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {dep.creator ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-5 w-5 ring-1 ring-slate-200">
                                    <AvatarImage src={dep.creator.avatar_url} />
                                    <AvatarFallback className="text-[9px]">
                                      {dep.creator.login[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    {dep.creator.login}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(dep.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 hover:bg-slate-100"
                                asChild
                              >
                                <a
                                  href={dep.url
                                    .replace(
                                      "api.github.com/repos",
                                      "github.com",
                                    )
                                    .replace("/deployments/", "/deployments#")}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View
                                </a>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <PaginationControls
                  rowsPerPage={rowsPerPage}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={filteredDeployments.length}
                />
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      {/* ── Setup Guide Dialog ── */}
      <Dialog
        open={!!guideService}
        onOpenChange={(open) => !open && setGuideService(null)}
      >
        {guideService && (
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <guideService.icon
                  className={`h-5 w-5 ${guideService.iconColor}`}
                />
                {guideService.guideTitle}
              </DialogTitle>
              <DialogDescription>
                Follow these steps to integrate {guideService.name} with
                DevCentral via GitHub Deployments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {guideService.guideSteps?.map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                    {step}
                  </p>
                </div>
              ))}
              <div className="bg-muted/60 rounded-lg p-3 text-xs text-muted-foreground mt-4">
                Once connected, {guideService.name} deployment events will
                appear automatically in the Deployment History table above.
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
