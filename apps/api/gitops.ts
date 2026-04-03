import path from "node:path";
import dotenv from "dotenv";

import cors from "cors";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

import express, { IRouter, Response } from "express";
import { authenticateToken } from "./authenticatetoken.js";
import { AuthenticatedRequest } from "./api_types/index.js";
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

router.get(
  "/api/github/repos/:owner/:repo/pulls",

  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 5,
      });
      res.json(data);
    } catch (error) {
      console.error("GitHub Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch pull requests from GitHub" });
    }
  },
);

router.get("/api/github/repos/:owner/:repo/actions", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 5,
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
    const { data } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 5,
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
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 5,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch issues from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/commits", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 5,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch commits from GitHub" });
  }
});

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
