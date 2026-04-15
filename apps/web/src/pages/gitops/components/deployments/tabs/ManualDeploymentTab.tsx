import {
  Rocket,
  Loader2,
  CheckCircle2,
  XCircle,
  GitBranch,
  ExternalLink,
  Globe,
  Server,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../../../components/ui/card.js";
import { Button } from "../../../../../components/ui/button.js";

import { Label } from "../../../../../components/ui/label.js";

import { DeployTargetPicker, WorkflowSetupGuide } from "../utilities.js";
import type { GitHubWorkflow } from "../../types.js";

export default function ManualDeploymentTab({
  selectedRepo,
  deployService,
  setDeployService,
  workflows,
  selectedWorkflow,
  setSelectedWorkflow,
  deployMode,
  setDeployMode,
  deployBranch,
  setDeployBranch,
  deployCommitSha,
  setDeployCommitSha,
  branches,
  recentCommits,
  vercelWorkflow,
  renderWorkflow,
  isCreatingPr,
  setupMsg,
  createWorkflowPr,
  handleDeploy,
  isDispatching,
  dispatchMsg,
  setDispatchMsg,
}: {
  selectedRepo: { owner: string; name: string };
  deployService: string | null;
  setDeployService: any;
  workflows: GitHubWorkflow[];
  selectedWorkflow: string;
  setSelectedWorkflow: (s: string) => void;
  deployMode: "latest" | "specific";
  setDeployMode: (v: "latest" | "specific") => void;
  deployBranch: string;
  setDeployBranch: (v: string) => void;
  deployCommitSha: string;
  setDeployCommitSha: (v: string) => void;
  branches: string[];
  recentCommits: Array<{ sha: string; message: string; author: string }>;
  vercelWorkflow: GitHubWorkflow | undefined;
  renderWorkflow: GitHubWorkflow | undefined;
  isCreatingPr: boolean;
  setupMsg: { type: "success" | "error"; text: string; prUrl?: string } | null;
  createWorkflowPr: (service: "vercel" | "render") => Promise<void>;
  handleDeploy: () => void;
  isDispatching: boolean;
  dispatchMsg: { type: "success" | "error"; text: string } | null;
  setDispatchMsg: (
    msg: { type: "success" | "error"; text: string } | null,
  ) => void;
}) {
  return (
    <Card className="border-slate-200 bg-white/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
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
                  Workflow detected: <strong>{vercelWorkflow.name}</strong>
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
            {/* Danger zone warning */}
            <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-300 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong>Live deployment:</strong> This will push{" "}
                <strong>{selectedRepo.name}</strong> to production
                infrastructure. Confirm the branch and target are correct before
                proceeding.
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
                    Deployment triggered — monitor progress in GitHub Actions.
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
  );
}
