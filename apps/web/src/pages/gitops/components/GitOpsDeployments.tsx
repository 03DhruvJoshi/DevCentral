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
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog.js";
import { Separator } from "../../../components/ui/separator.js";
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
  if (!latest) return <Badge variant="outline">No deployments</Badge>;
  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Deployed
    </Badge>
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
    <Card className="flex flex-col">
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
            <Badge className="bg-green-600 text-xs shrink-0">Connected</Badge>
          ) : service.status === "coming_soon" ? (
            <Badge variant="outline" className="text-xs shrink-0">
              Soon
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">
              Available
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {service.description}
        </p>
        {service.status === "available" && service.guideTitle && (
          <Button
            size="sm"
            variant="outline"
            className="w-fit text-xs"
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
}: {
  env: GitHubEnvironment;
  deployments: GitHubDeployment[];
}) {
  const latest = deployments.find((d) => d.environment === env.name);
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-sm capitalize">{env.name}</p>
            {env.protection_rules && env.protection_rules.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Protected ({env.protection_rules.length} rule
                {env.protection_rules.length > 1 ? "s" : ""})
              </p>
            )}
          </div>
          {latest ? (
            <Badge className="bg-green-600 text-xs">Active</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Never deployed
            </Badge>
          )}
        </div>

        {latest ? (
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              <code className="font-mono">{latest.ref}</code>
            </div>
            {latest.creator && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
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
          <p className="text-xs text-muted-foreground">
            No deployment history yet.
          </p>
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
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
            <Select value={deployBranch} onValueChange={setDeployBranch}>
              <SelectTrigger>
                <GitBranch className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select a branch..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={deployCommitSha} onValueChange={setDeployCommitSha}>
              <SelectTrigger className="h-auto">
                <SelectValue placeholder="Select a commit..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {recentCommits.map((c) => (
                  <SelectItem key={c.sha} value={c.sha}>
                    <div className="flex flex-col gap-0.5 py-0.5">
                      <span className="text-xs leading-snug">{c.message}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {c.sha.slice(0, 7)} · {c.author}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    <div className="rounded-lg border border-dashed p-4 space-y-4">
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
        <Button size="sm" variant="outline" className="w-fit text-xs" asChild>
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
          className="gap-1.5"
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
            sha: string;
            commit: { message: string; author: { name: string } };
            author: { login: string } | null;
          }> = await commitRes.json();
          setRecentCommits(
            rawCommits.map((c) => ({
              sha: c.sha,
              message: c.commit.message.split("\n")[0].slice(0, 72),
              author: c.author?.login ?? c.commit.author.name,
            })),
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
      {/* ── Environment Overview ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
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
                Create environments in your repository Settings → Environments,
                or connect Vercel/Render to auto-generate them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {environments.map((env) => (
              <EnvironmentCard
                key={env.id}
                env={env}
                deployments={deployments}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Manual Deploy Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-violet-600" />
            Manual Deployment
          </CardTitle>
          <CardDescription>
            Deploy <strong>{selectedRepo.name}</strong> to a specific service at
            the latest commit, a branch, or a specific commit SHA.
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
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
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
                  <Select
                    value={selectedWorkflow}
                    onValueChange={setSelectedWorkflow}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workflow..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {workflows.map((wf) => (
                        <SelectItem key={wf.id} value={String(wf.id)}>
                          {wf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    Workflow detected: <strong>{vercelWorkflow.name}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 px-2 text-xs"
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
                    Workflow detected: <strong>{renderWorkflow.name}</strong>
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
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                This will trigger a live deployment of{" "}
                <strong>{selectedRepo.name}</strong>. Confirm the target is
                correct before proceeding.
              </div>

              {dispatchMsg && (
                <div
                  className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
                    dispatchMsg.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {dispatchMsg.type === "success" ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      Deployment triggered successfully! Check your GitHub
                      Actions or the target service dashboard for progress.
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      Failed to trigger deployment: {dispatchMsg.text}
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                disabled={isDispatching}
                onClick={handleDeploy}
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
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

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
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
      </div>

      <Separator />

      {/* ── Deployment History ── */}
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Deployment History
        </h3>

        <Card>
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
                <Select
                  value={envFilter}
                  onValueChange={(v) => {
                    setEnvFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Environments</SelectItem>
                    {uniqueEnvironments.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />

            {isEnvLoading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading deployments...
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <Rocket className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {deployments.length === 0
                  ? "No deployments found. Connect Vercel or Render to see deployments here, or trigger one above."
                  : "No results match your filters."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Environment</TableHead>
                    <TableHead>Ref / SHA</TableHead>
                    <TableHead>Deployed By</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((dep) => (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {dep.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-sm">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs">{dep.ref}</code>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {dep.sha.slice(0, 7)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dep.creator ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={dep.creator.avatar_url} />
                              <AvatarFallback>
                                {dep.creator.login[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {dep.creator.login}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground capitalize">
                          {dep.task?.replace("-", " ") ?? "deploy"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(dep.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={dep.url
                              .replace("api.github.com/repos", "github.com")
                              .replace("/deployments/", "/deployments#")}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
      </div>

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
                <div key={i} className="flex items-start gap-3">
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
