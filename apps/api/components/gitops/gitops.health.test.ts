/**
 * Tests for gitops.ts — health and fix endpoints
 * These tests must run in a separate file because they need
 * GITHUB_TOKEN set before the module is imported (the token is
 * read at module-init time, not per-request).
 *
 * Routes covered:
 *   GET  /api/gitops/repos/:owner/:repo/health          — health scoring
 *   POST /api/gitops/repos/:owner/:repo/fix/:actionType — quick-fix actions
 */
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import type { NextFunction } from "express";
import type { AuthenticatedRequest } from "../../api_types/index.js";

// ── Set GITHUB_TOKEN before module loads ──────────────────────────────────────
// gitops.ts reads: const githubToken = `${process.env.GITHUB_TOKEN}`
// If undefined → "undefined" (string) and routes return 401.
// Setting it here ensures the module sees a real-looking token.
process.env.GITHUB_TOKEN = "ghp_test_health_token";

// ── Shared mock instance ──────────────────────────────────────────────────────

const db = {
  user: { findUnique: jest.fn() },
};

// Octokit rest mock — all methods throw by default so the health function's
// individual try/catch blocks each execute their catch path.
const mockRequest = jest.fn().mockRejectedValue(new Error("Not available"));

const mockRest = {
  repos: {
    getBranchProtection: jest.fn().mockRejectedValue(new Error("No protection")),
    getContent: jest.fn().mockRejectedValue(new Error("Not Found")),
    listCommits: jest.fn().mockRejectedValue(new Error("No commits")),
    listForAuthenticatedUser: jest.fn().mockResolvedValue({ data: [] }),
    listReleases: jest.fn().mockResolvedValue({ data: [] }),
    listDeployments: jest.fn().mockResolvedValue({ data: [] }),
    getAllEnvironments: jest.fn().mockResolvedValue({ data: { environments: [] } }),
    get: jest.fn().mockResolvedValue({ data: { default_branch: "main" } }),
    createOrUpdateFileContents: jest.fn().mockResolvedValue({}),
    updateBranchProtection: jest.fn().mockResolvedValue({}),
  },
  actions: {
    listRepoWorkflows: jest.fn().mockResolvedValue({ data: { workflows: [] } }),
    listWorkflowRunsForRepo: jest.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
  },
  pulls: { list: jest.fn().mockResolvedValue({ data: [] }), create: jest.fn() },
  issues: { listForRepo: jest.fn().mockResolvedValue({ data: [] }) },
  git: {
    getTree: jest.fn().mockResolvedValue({ data: { tree: [] } }),
    getRef: jest.fn(),
    deleteRef: jest.fn(),
    createRef: jest.fn(),
  },
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn(
    (req: AuthenticatedRequest, _res: unknown, next: NextFunction) => {
      req.user = {
        id: "user-id",
        email: "user@test.com",
        name: "Test User",
        password: "hashed-password",
        role: "DEV",
      };
      next();
    },
  ),
}));

jest.unstable_mockModule("../../prisma", () => ({
  default: db,
}));

jest.unstable_mockModule("octokit", () => ({
  Octokit: jest.fn(() => ({ rest: mockRest, request: mockRequest })),
}));

jest.unstable_mockModule("@octokit/request-error", () => ({
  RequestError: class RequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "RequestError";
    }
  },
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./gitops.js");

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(router);

let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply defaults after clearAllMocks resets implementations
  mockRest.repos.getBranchProtection.mockRejectedValue(new Error("No protection"));
  mockRest.repos.getContent.mockRejectedValue(new Error("Not Found"));
  mockRest.repos.listCommits.mockRejectedValue(new Error("No commits"));
  mockRest.actions.listRepoWorkflows.mockResolvedValue({ data: { workflows: [] } });
  mockRequest.mockRejectedValue(new Error("Not available"));
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("GET /api/gitops/repos/:owner/:repo/health", () => {
  it("returns 200 with a health score object when all API calls fail gracefully (catch-all path)", async () => {
    // All Octokit calls throw — each catch block runs and issues are added.
    // The function still returns a full health object with score from placeholders.
    const res = await request(app).get(
      "/api/gitops/repos/myorg/my-repo/health",
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalScore");
    expect(res.body).toHaveProperty("healthStatus");
    expect(res.body).toHaveProperty("securityScore");
    expect(res.body).toHaveProperty("codeQualityScore");
    expect(res.body).toHaveProperty("deploymentReadinessScore");
    expect(res.body).toHaveProperty("teamOwnershipScore");
    expect(res.body).toHaveProperty("aiSuggestions");
    expect(Array.isArray(res.body.aiSuggestions)).toBe(true);
  });

  it("returns 200 with improved security score when branch protection is enabled", async () => {
    mockRest.repos.getBranchProtection.mockResolvedValue({
      data: {
        enforce_admins: { enabled: true },
        required_status_checks: { contexts: ["ci", "test"] },
      },
    });
    mockRest.actions.listRepoWorkflows.mockResolvedValue({
      data: { workflows: [{ state: "active" }] },
    });

    const res = await request(app).get(
      "/api/gitops/repos/myorg/my-repo/health",
    );

    expect(res.status).toBe(200);
    expect(res.body.securityScore).toBeGreaterThan(0);
  });

  it("returns 200 with green status when score is high enough (all placeholders fulfilled)", async () => {
    // Branch protection, dependabot OK (no critical alerts), getContent resolves
    mockRest.repos.getBranchProtection.mockResolvedValue({
      data: {
        enforce_admins: { enabled: true },
        required_status_checks: { contexts: ["build"] },
      },
    });
    mockRequest.mockResolvedValue({ data: [] }); // no dependabot alerts
    mockRest.repos.getContent.mockResolvedValue({
      data: { content: Buffer.from("# My README\n\nThis is a long readme with lots of content explaining how to use this repo properly.").toString("base64") },
    });
    mockRest.repos.listCommits.mockResolvedValue({
      data: [{ commit: { committer: { date: new Date().toISOString() } } }],
    });
    mockRest.actions.listRepoWorkflows.mockResolvedValue({
      data: { workflows: [{ state: "active" }] },
    });

    const res = await request(app).get(
      "/api/gitops/repos/myorg/my-repo/health",
    );

    expect(res.status).toBe(200);
    // With all checks passing + placeholders, score should be high
    expect(res.body.totalScore).toBeGreaterThan(60);
  });
});

describe("POST /api/gitops/repos/:owner/:repo/fix/:actionType", () => {
  it("returns 200 with enable-dependabot (no API call needed — informational only)", async () => {
    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/enable-dependabot",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.actionType).toBe("enable-dependabot");
  });

  it("returns 200 with enable-branch-protection when GitHub API succeeds", async () => {
    mockRest.repos.updateBranchProtection.mockResolvedValue({});

    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/enable-branch-protection",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 200 with failed result when enable-branch-protection GitHub call throws", async () => {
    mockRest.repos.updateBranchProtection.mockRejectedValue(
      new Error("Requires admin access"),
    );

    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/enable-branch-protection",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it("returns 200 with add-codeowners when file creation succeeds", async () => {
    mockRest.repos.createOrUpdateFileContents.mockResolvedValue({});

    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/add-codeowners",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 200 with enforce-status-checks when branch protection update succeeds", async () => {
    mockRest.repos.updateBranchProtection.mockResolvedValue({});

    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/enforce-status-checks",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 200 with unknown action type falls to default case", async () => {
    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/totally-unknown-action",
    );

    expect(res.status).toBe(200);
    expect(res.body.result.error).toMatch(/unknown action type/i);
  });
});
