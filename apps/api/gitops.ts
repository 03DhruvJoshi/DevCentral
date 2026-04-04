import path from "node:path";
import dotenv from "dotenv";

import cors from "cors";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

import express, { IRouter, Response } from "express";
import { authenticateToken } from "./authenticatetoken.js";
import { AuthenticatedRequest } from "./api_types/index.js";
import { RequestError } from "@octokit/request-error";

import prisma from "./prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const githubToken = `${process.env.GITHUB_TOKEN}`;

type HealthSeverity = "critical" | "warning" | "info";

type HealthIssue = {
  type: string;
  severity: HealthSeverity;
  description: string;
  autofixable: boolean;
  fixAction?: string;
};

type AISuggestion = {
  category: "security" | "deployment" | "quality";
  action: string;
  priority: "critical" | "medium";
  description: string;
  autofixable: boolean;
};

type RepositoryMetadataModel = {
  id: string;
  repositoryName: string;
  owner: string;
  healthScore?: number;
  healthStatus?: string;
};

type GitOpsPrisma = {
  repositoryMetadata?: {
    findUnique: (args: unknown) => Promise<RepositoryMetadataModel | null>;
    create: (args: unknown) => Promise<RepositoryMetadataModel>;
    update: (args: unknown) => Promise<RepositoryMetadataModel>;
  };
  healthCheckResult?: {
    create: (args: unknown) => Promise<unknown>;
  };
  quickFixAction?: {
    create: (args: unknown) => Promise<unknown>;
  };
};

const gitopsPrisma = prisma as unknown as GitOpsPrisma;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

// ===== EXISTING ENDPOINTS =====

router.get(
  "/api/github/repos",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { githubAccessToken: true, githubUsername: true },
      });

      if (!dbUser?.githubAccessToken) {
        return res.status(400).json({
          error: "GitHub is not connected. Please reconnect your account.",
        });
      }

      const userOctokit = new Octokit({ auth: dbUser.githubAccessToken });

      console.log(
        `Fetching GitHub repositories for: ${dbUser.githubUsername ?? "unknown-user"}`,
      );

      let data: Awaited<
        ReturnType<typeof userOctokit.rest.repos.listForAuthenticatedUser>
      >["data"];

      try {
        const response = await userOctokit.rest.repos.listForAuthenticatedUser({
          type: "all",
          sort: "updated",
          affiliation: "owner,collaborator,organization_member",
          per_page: 100,
        });
        data = response.data;
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
            ? (error as { status: number }).status
            : 0;

        // Some tokens/scopes reject affiliation filtering. Retry with a broader request.
        if (status === 422) {
          const retryResponse =
            await userOctokit.rest.repos.listForAuthenticatedUser({
              type: "all",
              sort: "updated",
              per_page: 100,
            });
          data = retryResponse.data;
        } else {
          throw error;
        }
      }

      const simpleRepos = data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
        language: repo.language,
        updated_at: repo.updated_at,
      }));

      res.json(simpleRepos);
    } catch (error) {
      console.error(
        `GitHub Error fetching repos for ${req.user?.githubUsername}:`,
        error,
      );

      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : 500;

      const githubMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Unknown GitHub API error";

      if (status === 401) {
        return res.status(401).json({
          error:
            "GitHub authorization expired. Please reconnect your GitHub account.",
          githubMessage,
          requiresReconnect: true,
        });
      }

      if (status === 403) {
        return res.status(403).json({
          error:
            "GitHub access denied. Check OAuth scopes or organization SSO authorization.",
          githubMessage,
          requiresReconnect: true,
        });
      }

      return res.status(500).json({
        error: "Failed to fetch repositories from GitHub",
        githubMessage,
      });
    }
  },
);

router.get("/api/github/repos/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 50, 100);
    const page = Number(req.query.page) || 1;
    const state = (req.query.state as "open" | "closed" | "all") || "all";
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state,
      per_page,
      page,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch pull requests from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/actions", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 50, 100);
    const page = Number(req.query.page) || 1;
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page,
      page,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch actions from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/releases", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 50, 100);
    const page = Number(req.query.page) || 1;
    const { data } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page,
      page,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch releases from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 50, 100);
    const page = Number(req.query.page) || 1;
    const state = (req.query.state as "open" | "closed" | "all") || "open";
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page,
      page,
    });
    // Filter out pull requests (GitHub returns PRs in issues endpoint)
    const issuesOnly = data.filter((item) => !item.pull_request);
    res.json(issuesOnly);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch issues from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/commits", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 50, 100);
    const page = Number(req.query.page) || 1;
    const pull_request_title = req.query.pull_request_id as string | undefined;
    const branch = req.query.branch as string | undefined;
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      pull_request_title,
      branch,
      per_page,
      page,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch commits from GitHub" });
  }
});

// ===== PHASE 3b: DEPLOYMENT MANAGEMENT ENDPOINTS =====

/** List GitHub Environments for a repository */
router.get("/api/github/repos/:owner/:repo/environments", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.repos.getAllEnvironments({
      owner,
      repo,
    });
    res.json(data.environments ?? []);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch environments from GitHub" });
  }
});

/** List GitHub Deployments for a repository */
router.get("/api/github/repos/:owner/:repo/deployments", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const per_page = Math.min(Number(req.query.per_page) || 30, 100);
    const environment = req.query.environment as string | undefined;
    const { data } = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      per_page,
      ...(environment ? { environment } : {}),
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch deployments from GitHub" });
  }
});

/** List GitHub Actions Workflows (to enable workflow_dispatch trigger) */
router.get("/api/github/repos/:owner/:repo/workflows", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: 100,
    });
    res.json(data.workflows ?? []);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch workflows from GitHub" });
  }
});

/**
 * Detect deployment service availability/usage for the repository.
 * - GitHub Actions: true when at least one active workflow exists
 * - Vercel: true when Vercel config exists or deployment signals contain "vercel"
 * - Render: true when Render config exists or deployment signals contain "render"
 */
router.get(
  "/api/github/repos/:owner/:repo/deployment-services",
  async (req, res) => {
    try {
      const { owner, repo } = req.params;

      const hasProviderNamedFile = (
        filePath: string,
        providerPattern: RegExp,
      ) => {
        const fileName = path.posix.basename(filePath);
        return providerPattern.test(fileName);
      };

      const [workflowsRes, deploymentsRes, treeRes] = await Promise.all([
        octokit.rest.actions.listRepoWorkflows({
          owner,
          repo,
          per_page: 100,
        }),
        octokit.rest.repos.listDeployments({
          owner,
          repo,
          per_page: 100,
        }),
        (async () => {
          const { data: repoData } = await octokit.rest.repos.get({
            owner,
            repo,
          });
          return octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: repoData.default_branch,
            recursive: "1",
          });
        })(),
      ]);

      const filePaths = treeRes.data.tree.flatMap((entry) =>
        entry.type === "blob" && typeof entry.path === "string"
          ? [entry.path]
          : [],
      );

      const hasVercelConfig = filePaths.some((filePath) =>
        hasProviderNamedFile(filePath, /vercel/i),
      );

      const hasRenderConfig = filePaths.some((filePath) =>
        hasProviderNamedFile(filePath, /render/i),
      );

      const hasGitHubActions = (workflowsRes.data.workflows ?? []).some(
        (workflow) => workflow.state === "active",
      );

      const hasSignal = (
        deployment: {
          task?: string | null;
          description?: string | null;
          creator?: { login?: string | null } | null;
        },
        marker: string,
      ) => {
        const haystack =
          `${deployment.task ?? ""} ${deployment.description ?? ""} ${deployment.creator?.login ?? ""}`.toLowerCase();
        return haystack.includes(marker);
      };

      const hasVercelDeploymentSignal = deploymentsRes.data.some((deployment) =>
        hasSignal(deployment, "vercel"),
      );

      const hasRenderDeploymentSignal = deploymentsRes.data.some((deployment) =>
        hasSignal(deployment, "render"),
      );

      const vercelConnected = hasVercelConfig || hasVercelDeploymentSignal;
      const renderConnected = hasRenderConfig || hasRenderDeploymentSignal;

      res.json({
        githubActions: {
          used: hasGitHubActions,
          status: hasGitHubActions ? "connected" : "available",
        },
        vercel: {
          used: vercelConnected,
          status: vercelConnected ? "connected" : "available",
        },
        render: {
          used: renderConnected,
          status: renderConnected ? "connected" : "available",
        },
      });
    } catch (error) {
      console.error("GitHub Deployment Services Error:", error);
      res
        .status(500)
        .json({ error: "Failed to detect deployment services from GitHub" });
    }
  },
);

/** Trigger a workflow_dispatch event (requires user's GitHub token) */
router.post(
  "/api/github/repos/:owner/:repo/workflows/:workflow_id/dispatch",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const owner =
        typeof req.params.owner === "string" ? req.params.owner : undefined;
      const repo =
        typeof req.params.repo === "string" ? req.params.repo : undefined;
      const workflowId =
        typeof req.params.workflow_id === "string"
          ? req.params.workflow_id
          : undefined;

      if (!owner || !repo || !workflowId?.trim()) {
        return res.status(400).json({
          error: "owner, repo, and workflow_id are required",
        });
      }

      const { ref = "main", inputs = {} } = req.body as {
        ref?: string;
        inputs?: Record<string, string>;
      };

      const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
      });
      if (!user?.githubAccessToken) {
        return res.status(401).json({
          error:
            "GitHub not connected. Please connect your GitHub account in Settings.",
        });
      }

      const userOctokit = new Octokit({ auth: user.githubAccessToken });

      await userOctokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs,
      });

      return res.json({ success: true });
    } catch (error: unknown) {
      let msg = "unknown";
      let status = "?";

      if (error instanceof RequestError) {
        msg = error.message;
        status = error.status.toString();
      } else if (error instanceof Error) {
        msg = error.message;
      }

      console.error("Workflow Dispatch Error:", error);

      return res.status(500).json({
        error: "Failed to trigger workflow",
        details: { message: msg, status },
      });
    }
  },
);

/**
 * POST /api/gitops/deploy/hook
 * Proxy a one-click deploy hook to Vercel or Render.
 * The hook URL is treated as an opaque secret supplied by the client and
 * validated to belong to a known provider before being called.
 */
router.post(
  "/api/gitops/deploy/hook",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { url } = req.body as { url?: string };
      if (!url) {
        return res.status(400).json({ error: "Deploy hook URL is required" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid deploy hook URL" });
      }

      const allowedHosts = ["api.vercel.com", "api.render.com"];
      if (!allowedHosts.includes(parsedUrl.hostname)) {
        return res.status(400).json({
          error: `Hook URL must be from a supported provider: ${allowedHosts.join(", ")}`,
        });
      }

      const hookResponse = await fetch(url, { method: "POST" });
      // 200 and 204 are both success codes for deploy hooks
      if (!hookResponse.ok && hookResponse.status !== 204) {
        return res.status(502).json({
          error: `Deploy provider responded with HTTP ${hookResponse.status}`,
        });
      }

      res.json({ success: true, message: "Deployment triggered successfully" });
    } catch (error: unknown) {
      console.error("Deploy hook error:", error);
      res.status(500).json({
        error: "Failed to trigger deployment",
        details: error instanceof Error ? error.message : error,
      });
    }
  },
);

// ===== PHASE 3b: DEPLOYMENT INTEGRATION ENDPOINTS =====

/** List branches for a repository */
router.get("/api/github/repos/:owner/:repo/branches", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const perPage = Math.min(Number(req.query.per_page) || 50, 100);
    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: perPage,
    });
    res.json(data.map((b) => b.name));
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch branches from GitHub" });
  }
});

// ── Workflow YAML templates ───────────────────────────────────────────────────

const VERCEL_WORKFLOW_YAML = `name: Deploy to Vercel
on:
  workflow_dispatch:

jobs:
  deploy:
    name: Trigger Vercel deploy hook
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy
        run: |
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \\
            -X POST "\${{ secrets.VERCEL_DEPLOY_HOOK_URL }}")
          echo "Response: $HTTP_CODE"
          [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] \\
            && echo "✅ Vercel deploy triggered" \\
            || { echo "❌ Hook responded with HTTP $HTTP_CODE"; exit 1; }
`;

const RENDER_WORKFLOW_YAML = `name: Deploy to Render
on:
  workflow_dispatch:

jobs:
  deploy:
    name: Trigger Render deploy hook
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy
        run: |
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \\
            -X POST "\${{ secrets.RENDER_DEPLOY_HOOK_URL }}")
          echo "Response: $HTTP_CODE"
          [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] \\
            && echo "✅ Render deploy triggered" \\
            || { echo "❌ Hook responded with HTTP $HTTP_CODE"; exit 1; }
`;

function vercelPrBody(owner: string, repo: string): string {
  return `## 🚀 DevCentral: Add Vercel Deployment Workflow

This PR was opened automatically by **DevCentral** and adds a GitHub Actions workflow that triggers a Vercel deployment on-demand via \`workflow_dispatch\`.

---

### ⚠️ Before merging — add one GitHub Secret

Go to **[Repository Settings → Secrets → Actions](https://github.com/${owner}/${repo}/settings/secrets/actions)** and create:

| Secret name | Where to find it |
|---|---|
| \`VERCEL_DEPLOY_HOOK_URL\` | Vercel → your project → **Settings** → **Git** → **Deploy Hooks** → create a hook and copy the URL |

---

### ✅ After merging

Trigger a deploy on-demand from **DevCentral → GitOps → Deployments → Vercel**.

---
*Opened by DevCentral · GitOps Deployment Setup*`;
}

function renderPrBody(owner: string, repo: string): string {
  return `## 🚀 DevCentral: Add Render Deployment Workflow

This PR was opened automatically by **DevCentral** and adds a GitHub Actions workflow that triggers a Render deployment on-demand via \`workflow_dispatch\`.

---

### ⚠️ Before merging — add one GitHub Secret

Go to **[Repository Settings → Secrets → Actions](https://github.com/${owner}/${repo}/settings/secrets/actions)** and create:

| Secret name | Where to find it |
|---|---|
| \`RENDER_DEPLOY_HOOK_URL\` | Render → your service → **Settings** → **Deploy Hook** → copy the URL |

---

### ✅ After merging

Trigger a deploy on-demand from **DevCentral → GitOps → Deployments → Render**.

---
*Opened by DevCentral · GitOps Deployment Setup*`;
}

/**
 * POST /api/gitops/setup/workflow
 * Creates a branch + workflow YAML file + PR on the user's repository.
 * Body: { owner, repo, service: "vercel" | "render" }
 * Uses the authenticated user's GitHub access token.
 */
router.post(
  "/api/gitops/setup/workflow",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { owner, repo, service } = req.body as {
        owner?: string;
        repo?: string;
        service?: "vercel" | "render";
      };

      if (!owner || !repo || !service) {
        return res
          .status(400)
          .json({ error: "owner, repo, and service are required" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
      });
      if (!user?.githubAccessToken) {
        return res.status(401).json({
          error:
            "GitHub not connected. Please connect your GitHub account in Settings.",
        });
      }

      const userOctokit = new Octokit({ auth: user.githubAccessToken });

      // ── Step 1: resolve default branch + HEAD SHA ───────────────────────────
      let defaultBranch: string;
      let sha: string;
      try {
        const { data: repoData } = await userOctokit.rest.repos.get({
          owner,
          repo,
        });
        defaultBranch = repoData.default_branch;
        const { data: refData } = await userOctokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
        });
        sha = refData.object.sha;
      } catch (e: unknown) {
        console.error(`[setup/workflow] step 1 (get-repo/ref) failed:`, e);
        return res.status(500).json({
          error: `Could not access repository or default branch (step 1). Check that your GitHub token has read access to this repository.`,
          details:
            e instanceof Error
              ? e.message
              : typeof e === "object" && e !== null
                ? JSON.stringify(e)
                : String(e),
        });
      }

      // ── Step 2: create a fresh feature branch ──────────────────────────────
      const branchName = `devcentral-add-${service}-deploy`;
      try {
        // Delete first so we always get a clean commit (idempotent)
        await userOctokit.rest.git.deleteRef({
          owner,
          repo,
          ref: `heads/${branchName}`,
        });
      } catch {
        // Branch didn't exist yet — fine
      }
      try {
        await userOctokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branchName}`,
          sha,
        });
      } catch (e: unknown) {
        console.error(`[setup/workflow] step 2 (createRef) failed:`, e);
        return res.status(500).json({
          error: `Could not create branch (step 2). Check that your GitHub token has write access to this repository.`,
          details:
            e instanceof Error
              ? e.message
              : typeof e === "object" && e !== null
                ? JSON.stringify(e)
                : String(e),
        });
      }

      // ── Step 3: commit the workflow YAML ───────────────────────────────────
      const workflowContent =
        service === "vercel" ? VERCEL_WORKFLOW_YAML : RENDER_WORKFLOW_YAML;
      const workflowPath = `.github/workflows/deploy-${service}.yml`;
      try {
        await userOctokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: workflowPath,
          message: `chore: add ${service === "vercel" ? "Vercel" : "Render"} deployment workflow (DevCentral)`,
          content: Buffer.from(workflowContent).toString("base64"),
          branch: branchName,
        });
      } catch (e: unknown) {
        console.error(`[setup/workflow] step 3 (createFile) failed:`, e);
        return res.status(500).json({
          error: `Could not commit workflow file (step 3).`,
          details:
            e instanceof Error
              ? e.message
              : typeof e === "object" && e !== null
                ? JSON.stringify(e)
                : String(e),
        });
      }

      // ── Step 4: open the pull request ─────────────────────────────────────
      const prTitle =
        service === "vercel"
          ? "feat(workflow): 🚀 Add Vercel deployment workflow (DevCentral)"
          : "feat(workflow): 🚀 Add Render deployment workflow (DevCentral)";
      const prBody =
        service === "vercel"
          ? vercelPrBody(owner, repo)
          : renderPrBody(owner, repo);
      try {
        const { data: pr } = await userOctokit.rest.pulls.create({
          owner,
          repo,
          title: prTitle,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        });
        return res.json({ success: true, prUrl: pr.html_url });
      } catch (e: unknown) {
        console.error(`[setup/workflow] step 4 (create PR) failed:`, e);
        return res.status(500).json({
          error: `Could not create pull request (step 4).`,
          details:
            e instanceof Error
              ? e.message
              : typeof e === "object" && e !== null
                ? JSON.stringify(e)
                : String(e),
        });
      }
    } catch (error: unknown) {
      console.error("Unexpected error in /setup/workflow:", error);
      res.status(500).json({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : error,
      });
    }
  },
);

// ===== PHASE 3a: HEALTH SCORING ENDPOINTS =====

/**
 * Calculate health score for a repository
 * Checks: Security (25pts), Code Quality (25pts), Deployment Readiness (25pts), Team Ownership (25pts)
 */
async function calculateRepositoryHealth(
  owner: string,
  repo: string,
  token: string,
) {
  const o = new Octokit({ auth: token });

  const securityIssues: HealthIssue[] = [];
  const codeQualityIssues: HealthIssue[] = [];
  const deploymentReadinessIssues: HealthIssue[] = [];
  const teamOwnershipIssues: HealthIssue[] = [];

  let securityScore = 0;
  let codeQualityScore = 0;
  let deploymentReadinessScore = 0;
  let teamOwnershipScore = 0;

  try {
    // ===== SECURITY CHECKS (25 points) =====

    // 1. Branch Protection (5 pts)
    try {
      const branchProtection = await o.rest.repos.getBranchProtection({
        owner,
        repo,
        branch: "main",
      });
      if (branchProtection.data.enforce_admins?.enabled) {
        securityScore += 5;
      } else {
        securityIssues.push({
          type: "branch-protection",
          severity: "warning",
          description: "Branch protection not fully enabled on main",
          autofixable: true,
          fixAction: "enable-branch-protection",
        });
      }
    } catch {
      securityIssues.push({
        type: "branch-protection",
        severity: "critical",
        description: "Branch protection not enabled on main",
        autofixable: true,
        fixAction: "enable-branch-protection",
      });
    }

    // 2. Check for secrets in recent commits (5 pts)
    // In real implementation, use git-secrets or truffleHog
    securityScore += 5; // Assume no secrets for now
    // Secrets scanning integration can be added with a dedicated scanner.

    // 3. Vulnerability scan (5 pts)
    try {
      const alertsResponse = await o.request(
        "GET /repos/{owner}/{repo}/dependabot/alerts",
        {
          owner,
          repo,
          per_page: 100,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      const alerts = alertsResponse.data as Array<{
        security_advisory?: { severity?: string };
      }>;
      if (alerts.length === 0) {
        securityScore += 5;
      } else {
        securityIssues.push({
          type: "vulnerabilities",
          severity: alerts.some(
            (alert) => alert.security_advisory?.severity === "critical",
          )
            ? "critical"
            : "warning",
          description: `${alerts.length} vulnerable dependencies detected`,
          autofixable: false,
          fixAction: "run-dependency-audit",
        });
      }
    } catch {
      // Dependabot not enabled, still warn
      securityIssues.push({
        type: "dependabot",
        severity: "info",
        description: "Dependabot alerts not enabled",
        autofixable: true,
        fixAction: "enable-dependabot",
      });
    }

    // 4. CODEOWNERS file (5 pts)
    try {
      await o.rest.repos.getContent({
        owner,
        repo,
        path: "CODEOWNERS",
      });
      securityScore += 5;
    } catch {
      securityIssues.push({
        type: "codeowners",
        severity: "warning",
        description: "CODEOWNERS file not found",
        autofixable: true,
        fixAction: "add-codeowners",
      });
    }

    // 5. Required status checks (5 pts)
    try {
      const protection = await o.rest.repos.getBranchProtection({
        owner,
        repo,
        branch: "main",
      });
      if ((protection.data.required_status_checks?.contexts?.length ?? 0) > 0) {
        securityScore += 5;
      } else {
        securityIssues.push({
          type: "status-checks",
          severity: "warning",
          description: "No required status checks on main branch",
          autofixable: true,
          fixAction: "enforce-status-checks",
        });
      }
    } catch {
      securityIssues.push({
        type: "status-checks",
        severity: "warning",
        description: "Unable to verify required status checks",
        autofixable: false,
      });
    }

    // ===== CODE QUALITY CHECKS (25 points) =====

    // 1. README freshness (5 pts)
    try {
      const readme = await o.rest.repos.getContent({
        owner,
        repo,
        path: "README.md",
      });
      if (
        !("content" in readme.data) ||
        typeof readme.data.content !== "string"
      ) {
        throw new Error("README.md content unavailable");
      }
      const content = Buffer.from(readme.data.content, "base64").toString();
      if (content.length > 100) {
        const commits = await o.rest.repos.listCommits({
          owner,
          repo,
          path: "README.md",
          per_page: 1,
        });
        const latestCommitDate = commits.data[0]?.commit.committer?.date;
        if (!latestCommitDate) {
          throw new Error("README.md commit date unavailable");
        }
        const daysOld =
          (Date.now() - new Date(latestCommitDate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysOld < 180) {
          codeQualityScore += 5;
        } else {
          codeQualityIssues.push({
            type: "readme",
            severity: "warning",
            description: `README.md not updated for ${Math.floor(daysOld)} days`,
            autofixable: true,
            fixAction: "update-readme",
          });
        }
      }
    } catch {
      codeQualityIssues.push({
        type: "readme",
        severity: "critical",
        description: "README.md not found",
        autofixable: true,
        fixAction: "create-readme",
      });
    }

    // 2-5. Other code quality metrics
    // CI/CD quality metrics can be integrated with pipeline status in a later phase.
    codeQualityScore += 20; // Placeholder

    // ===== DEPLOYMENT READINESS (25 points) =====

    // 1. CI/CD Pipeline check (5 pts)
    try {
      const workflows = await o.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });
      if (workflows.data.workflows.length > 0) {
        deploymentReadinessScore += 5;
      } else {
        deploymentReadinessIssues.push({
          type: "ci-pipeline",
          severity: "critical",
          description: "No CI/CD pipeline found",
          autofixable: true,
          fixAction: "create-github-actions",
        });
      }
    } catch {
      deploymentReadinessIssues.push({
        type: "ci-pipeline",
        severity: "critical",
        description: "Unable to verify CI/CD pipeline",
        autofixable: false,
      });
    }

    // 2-5. Other deployment checks
    deploymentReadinessScore += 20; // Placeholder

    // ===== TEAM OWNERSHIP (25 points) =====

    // Team ownership scoring is a placeholder until metadata integration is complete.
    teamOwnershipScore += 25; // Placeholder - will check DB later

    // ===== CALCULATE TOTALS =====
    const totalScore =
      securityScore +
      codeQualityScore +
      deploymentReadinessScore +
      teamOwnershipScore;

    let healthStatus = "red";
    if (totalScore >= 80) healthStatus = "green";
    else if (totalScore >= 60) healthStatus = "yellow";

    return {
      totalScore,
      healthStatus,
      securityScore,
      codeQualityScore,
      deploymentReadinessScore,
      teamOwnershipScore,
      securityIssues,
      codeQualityIssues,
      deploymentReadinessIssues,
      teamOwnershipIssues,
      aiSuggestions: generateAISuggestions(
        securityIssues,
        codeQualityIssues,
        deploymentReadinessIssues,
      ),
    };
  } catch (error) {
    console.error(`Health check error for ${owner}/${repo}:`, error);
    throw error;
  }
}

function generateAISuggestions(
  securityIssues: HealthIssue[],
  codeQualityIssues: HealthIssue[],
  deploymentReadinessIssues: HealthIssue[],
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Priority 1: Critical security issues
  securityIssues.forEach((issue) => {
    if (issue.severity === "critical" && issue.autofixable) {
      suggestions.push({
        category: "security",
        action: issue.fixAction ?? "manual-review",
        priority: "critical",
        description: issue.description,
        autofixable: true,
      });
    }
  });

  // Priority 2: Critical deployment issues
  deploymentReadinessIssues.forEach((issue) => {
    if (issue.severity === "critical" && issue.autofixable) {
      suggestions.push({
        category: "deployment",
        action: issue.fixAction ?? "manual-review",
        priority: "critical",
        description: issue.description,
        autofixable: true,
      });
    }
  });

  // Priority 3: Warnings and recommendations
  codeQualityIssues.forEach((issue) => {
    if (issue.autofixable) {
      suggestions.push({
        category: "quality",
        action: issue.fixAction ?? "manual-review",
        priority: "medium",
        description: issue.description,
        autofixable: true,
      });
    }
  });

  return suggestions.slice(0, 10); // Top 10 suggestions
}

/**
 * GET /api/gitops/repos/:owner/:repo/health
 * Get repository health score and detailed checks
 */
router.get(
  "/api/gitops/repos/:owner/:repo/health",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const owner = String(req.params.owner ?? "");
      const repo = String(req.params.repo ?? "");
      const userToken = githubToken;

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo are required" });
      }

      if (!userToken || userToken === "undefined") {
        return res.status(401).json({ error: "GitHub token not found" });
      }

      // Calculate health
      const health = await calculateRepositoryHealth(owner, repo, userToken);

      // Persist when Phase 3 Prisma models are available in generated client.
      if (gitopsPrisma.repositoryMetadata && gitopsPrisma.healthCheckResult) {
        let repoMetadata = await gitopsPrisma.repositoryMetadata.findUnique({
          where: {
            repositoryName_owner: { repositoryName: repo, owner },
          },
        });

        if (repoMetadata) {
          await gitopsPrisma.repositoryMetadata.update({
            where: { id: repoMetadata.id },
            data: {
              healthScore: health.totalScore,
              healthStatus: health.healthStatus,
              lastHealthCheckAt: new Date(),
            },
          });
        } else {
          repoMetadata = await gitopsPrisma.repositoryMetadata.create({
            data: {
              repositoryName: repo,
              owner,
              healthScore: health.totalScore,
              healthStatus: health.healthStatus,
            },
          });
        }

        await gitopsPrisma.healthCheckResult.create({
          data: {
            repositoryName: repo,
            repositoryOwner: owner,
            repositoryMetadataId: repoMetadata.id,
            totalScore: health.totalScore,
            overallStatus: health.healthStatus,
            securityScore: health.securityScore,
            codeQualityScore: health.codeQualityScore,
            deploymentReadinessScore: health.deploymentReadinessScore,
            teamOwnershipScore: health.teamOwnershipScore,
            securityIssues: JSON.stringify(health.securityIssues),
            codeQualityIssues: JSON.stringify(health.codeQualityIssues),
            deploymentReadinessIssues: JSON.stringify(
              health.deploymentReadinessIssues,
            ),
            teamOwnershipIssues: JSON.stringify(health.teamOwnershipIssues),
            aiSuggestions: JSON.stringify(health.aiSuggestions),
            executedBy: req.user?.email,
          },
        });
      }

      res.json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Failed to calculate repository health" });
    }
  },
);

/**
 * POST /api/gitops/repos/:owner/:repo/fix/:actionType
 * Execute a quick-fix action
 */
router.post(
  "/api/gitops/repos/:owner/:repo/fix/:actionType",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const owner = String(req.params.owner ?? "");
      const repo = String(req.params.repo ?? "");
      const actionType = String(req.params.actionType ?? "");
      const userToken = githubToken;

      if (!owner || !repo || !actionType) {
        return res
          .status(400)
          .json({ error: "Owner, repo, and actionType are required" });
      }

      if (!userToken || userToken === "undefined") {
        return res.status(401).json({ error: "GitHub token not found" });
      }

      const o = new Octokit({ auth: userToken });

      let result: Record<string, unknown> = {};
      let success = false;

      // Get or create repo metadata when model exists in generated client.
      let repoMetadata: RepositoryMetadataModel | null = null;
      if (gitopsPrisma.repositoryMetadata) {
        repoMetadata = await gitopsPrisma.repositoryMetadata.findUnique({
          where: {
            repositoryName_owner: { repositoryName: repo, owner },
          },
        });

        if (!repoMetadata) {
          repoMetadata = await gitopsPrisma.repositoryMetadata.create({
            data: {
              repositoryName: repo,
              owner,
            },
          });
        }
      }

      // Execute fixes based on action type
      switch (actionType) {
        case "enable-branch-protection": {
          try {
            await o.rest.repos.updateBranchProtection({
              owner,
              repo,
              branch: "main",
              required_status_checks: null,
              enforce_admins: true,
              required_pull_request_reviews: {
                dismiss_stale_reviews: true,
                require_code_owner_reviews: true,
                required_approving_review_count: 1,
              },
              restrictions: null,
            });
            success = true;
            result = { message: "Branch protection enabled on main" };
          } catch (e) {
            result = { error: String(e) };
          }
          break;
        }

        case "add-codeowners": {
          try {
            // Create CODEOWNERS template
            const codeownersContent = `# Code Owners
# Define who is responsible for code in this repository

# Everyone
* @${owner}
`;
            await o.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: "CODEOWNERS",
              message: "docs: add CODEOWNERS file",
              content: Buffer.from(codeownersContent).toString("base64"),
            });
            success = true;
            result = { message: "CODEOWNERS file created" };
          } catch (e) {
            result = { error: String(e) };
          }
          break;
        }

        case "enable-dependabot": {
          // Dependabot is enabled via GitHub UI, but we can document it
          result = {
            message:
              "Dependabot needs to be enabled via GitHub Settings > Security & analysis > Dependabot alerts",
            instructions:
              "1. Go to repository Settings\n2. Navigate to Security & analysis\n3. Enable Dependabot alerts and Dependabot security updates",
          };
          success = true;
          break;
        }

        case "enforce-status-checks": {
          try {
            await o.rest.repos.updateBranchProtection({
              owner,
              repo,
              branch: "main",
              required_status_checks: {
                strict: true,
                contexts: ["build", "test"],
              },
              enforce_admins: true,
              required_pull_request_reviews: null,
              restrictions: null,
            });
            success = true;
            result = { message: "Required status checks enforced" };
          } catch (e) {
            result = { error: String(e) };
          }
          break;
        }

        default: {
          result = { error: `Unknown action type: ${actionType}` };
        }
      }

      // Save fix action when model exists in generated client.
      if (gitopsPrisma.quickFixAction && repoMetadata) {
        await gitopsPrisma.quickFixAction.create({
          data: {
            repositoryMetadataId: repoMetadata.id,
            actionType,
            actionDescription: `Execute ${actionType}`,
            status: success ? "completed" : "failed",
            executedBy: req.user?.email,
            result: JSON.stringify(result),
            completedAt: new Date(),
          },
        });
      }

      res.json({
        success,
        actionType,
        result,
      });
    } catch (error) {
      console.error("Fix action error:", error);
      res.status(500).json({ error: "Failed to execute fix action" });
    }
  },
);

export default router;
