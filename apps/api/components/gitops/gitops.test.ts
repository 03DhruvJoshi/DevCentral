/**
 * Tests for gitops.ts — GitHub repository & GitOps endpoints
 * Routes covered:
 *   GET /api/github/repos                      — list authenticated user repos
 *   GET /api/github/repos/:owner/:repo/pulls   — list pull requests
 */
import {
  jest,
  expect,
  it,
  describe,
  beforeEach,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import express from "express";
import type { NextFunction } from "express";

import type { AuthenticatedRequest } from "../../api_types/index.js";

// ── Shared mock instances ─────────────────────────────────────────────────────

const db = {
  user: { findUnique: jest.fn() },
};

type GitHubUserRecord = {
  githubAccessToken: string | null;
  githubUsername: string | null;
};

type GitHubRepo = {
  id: number;
  name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
};

type GitHubPullRequest = {
  number: number;
  title: string;
  state: "open" | "closed" | "all";
};

const mockRest = {
  repos: {
    listForAuthenticatedUser: jest.fn(),
    listReleases: jest.fn(),
    listDeployments: jest.fn(),
    getAllEnvironments: jest.fn(),
    listCommits: jest.fn(),
    get: jest.fn(),
    createOrUpdateFileContents: jest.fn(),
  },
  pulls: { list: jest.fn(), create: jest.fn() },
  actions: {
    listWorkflowRunsForRepo: jest.fn(),
    listRepoWorkflows: jest.fn(),
  },
  issues: { listForRepo: jest.fn() },
  git: {
    getTree: jest.fn(),
    getRef: jest.fn(),
    deleteRef: jest.fn(),
    createRef: jest.fn(),
  },
};

const findUniqueMock = jest.fn(
  async (): Promise<GitHubUserRecord | null> => null,
);

const listForAuthenticatedUserMock = jest.fn(
  async (): Promise<{ data: GitHubRepo[] }> => ({ data: [] }),
);

const listPullsMock = jest.fn(
  async (): Promise<{ data: GitHubPullRequest[] }> => ({
    data: [],
  }),
);

db.user.findUnique = findUniqueMock;
mockRest.repos.listForAuthenticatedUser = listForAuthenticatedUserMock;
mockRest.pulls.list = listPullsMock;

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
  Octokit: jest.fn(() => ({ rest: mockRest })),
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
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
    return undefined;
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("GET /api/github/repos", () => {
  it("returns 200 with a simplified repo list when GitHub responds successfully", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });
    listForAuthenticatedUserMock.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "my-repo",
          owner: { login: "testuser" },
          description: "A test repo",
          html_url: "https://github.com/testuser/my-repo",
          private: false,
          language: "TypeScript",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
    });

    const res = await Promise.resolve(request(app).get("/api/github/repos"));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("my-repo");
  });

  it("returns 400 when the user has not connected their GitHub account", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: null,
      githubUsername: null,
    });

    const res = await Promise.resolve(request(app).get("/api/github/repos"));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not connected/i);
  });

  it("returns 401 when the stored GitHub token has expired or been revoked", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_expired",
      githubUsername: "testuser",
    });
    listForAuthenticatedUserMock.mockRejectedValue(
      Object.assign(new Error("Bad credentials"), { status: 401 }),
    );

    const res = await Promise.resolve(request(app).get("/api/github/repos"));

    expect(res.status).toBe(401);
    expect(res.body.requiresReconnect).toBe(true);
  });
});

describe("GET /api/github/repos/:owner/:repo/pulls", () => {
  it("returns 200 with pull request data from GitHub", async () => {
    listPullsMock.mockResolvedValue({
      data: [{ number: 42, title: "feat: new feature", state: "open" }],
    });

    const res = await Promise.resolve(
      request(app).get("/api/github/repos/myorg/my-repo/pulls"),
    );

    expect(res.status).toBe(200);
    expect(res.body[0].number).toBe(42);
  });

  it("returns 500 when the GitHub API returns an unexpected server error", async () => {
    listPullsMock.mockRejectedValue(
      Object.assign(new Error("GitHub 500: Internal Server Error"), {
        status: 500,
      }),
    );

    const res = await Promise.resolve(
      request(app).get("/api/github/repos/myorg/my-repo/pulls"),
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/pull requests/i);
  });

  it("returns 500 when the GitHub API times out at the network layer (ECONNRESET)", async () => {
    listPullsMock.mockRejectedValue(
      new Error("ECONNRESET: socket hang up — GitHub did not respond"),
    );

    const res = await Promise.resolve(
      request(app).get("/api/github/repos/myorg/my-repo/pulls"),
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/pull requests/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/actions ───────────────────────────────

describe("GET /api/github/repos/:owner/:repo/actions", () => {
  it("returns 200 with workflow run data from GitHub", async () => {
    (mockRest.actions.listWorkflowRunsForRepo as jest.Mock).mockResolvedValue({
      data: { workflow_runs: [{ id: 1, status: "completed", conclusion: "success" }] },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/actions",
    );

    expect(res.status).toBe(200);
  });

  it("returns 500 when GitHub API fails for actions", async () => {
    (mockRest.actions.listWorkflowRunsForRepo as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/actions",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/actions/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/releases ──────────────────────────────

describe("GET /api/github/repos/:owner/:repo/releases", () => {
  it("returns 200 with releases from GitHub", async () => {
    (mockRest.repos.listReleases as jest.Mock).mockResolvedValue({
      data: [{ id: 1, tag_name: "v1.0.0" }],
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/releases",
    );

    expect(res.status).toBe(200);
    expect(res.body[0].tag_name).toBe("v1.0.0");
  });

  it("returns 500 when GitHub API fails for releases", async () => {
    (mockRest.repos.listReleases as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/releases",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/releases/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/issues ────────────────────────────────

describe("GET /api/github/repos/:owner/:repo/issues", () => {
  it("returns 200 with issues (non-PRs) from GitHub", async () => {
    (mockRest.issues.listForRepo as jest.Mock).mockResolvedValue({
      data: [
        { number: 1, title: "Bug report", pull_request: undefined },
        { number: 2, title: "PR item", pull_request: { url: "..." } },
      ],
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/issues",
    );

    expect(res.status).toBe(200);
    // PR items should be filtered out
    expect(res.body).toHaveLength(1);
    expect(res.body[0].number).toBe(1);
  });

  it("returns 500 when GitHub API fails for issues", async () => {
    (mockRest.issues.listForRepo as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/issues",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/issues/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/commits ───────────────────────────────

describe("GET /api/github/repos/:owner/:repo/commits", () => {
  it("returns 200 with commit data from GitHub", async () => {
    (mockRest.repos.listCommits as jest.Mock).mockResolvedValue({
      data: [{ sha: "abc123", commit: { message: "feat: add feature" } }],
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/commits",
    );

    expect(res.status).toBe(200);
    expect(res.body[0].sha).toBe("abc123");
  });

  it("returns 500 when GitHub API fails for commits", async () => {
    (mockRest.repos.listCommits as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/commits",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/commits/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/environments ──────────────────────────

describe("GET /api/github/repos/:owner/:repo/environments", () => {
  it("returns 200 with an array of environments", async () => {
    (mockRest.repos.getAllEnvironments as jest.Mock).mockResolvedValue({
      data: { environments: [{ id: 1, name: "production" }] },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/environments",
    );

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("production");
  });

  it("returns 500 when GitHub API fails for environments", async () => {
    (mockRest.repos.getAllEnvironments as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/environments",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/environments/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/deployments ───────────────────────────

describe("GET /api/github/repos/:owner/:repo/deployments", () => {
  it("returns 200 with deployment data", async () => {
    (mockRest.repos.listDeployments as jest.Mock).mockResolvedValue({
      data: [{ id: 1, environment: "production" }],
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployments",
    );

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(1);
  });

  it("returns 500 when GitHub API fails for deployments", async () => {
    (mockRest.repos.listDeployments as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployments",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/deployments/i);
  });
});

// ── GET /api/github/repos/:owner/:repo/workflows ─────────────────────────────

describe("GET /api/github/repos/:owner/:repo/workflows", () => {
  it("returns 200 with workflow list", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockResolvedValue({
      data: { workflows: [{ id: 1, name: "CI", state: "active" }] },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/workflows",
    );

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("CI");
  });

  it("returns 500 when GitHub API fails for workflows", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/workflows",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/workflows/i);
  });
});

// ── POST /api/gitops/deploy/hook ─────────────────────────────────────────────

describe("POST /api/gitops/deploy/hook", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 when no URL is provided", async () => {
    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when the URL is not a valid URL", async () => {
    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({ url: "not-a-valid-url" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 400 when URL is not from an allowed provider", async () => {
    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({ url: "https://api.unknown-provider.com/hook/123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/supported provider/i);
  });

  it("returns 200 when a valid Vercel deploy hook is triggered successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({ url: "https://api.vercel.com/v1/integrations/deploy/hook123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 502 when the deploy hook returns a non-OK response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({ url: "https://api.vercel.com/v1/integrations/deploy/hook123" });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/HTTP 500/i);
  });

  it("returns 500 when fetch throws a network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("ECONNRESET"));

    const res = await request(app)
      .post("/api/gitops/deploy/hook")
      .send({ url: "https://api.vercel.com/v1/integrations/deploy/hook123" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to trigger/i);
  });
});

// ── POST /api/github/repos/:owner/:repo/workflows/:id/dispatch ───────────────

describe("POST /api/github/repos/:owner/:repo/workflows/:id/dispatch", () => {
  it("returns 401 when user has not connected GitHub", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: null,
      githubUsername: null,
    });

    const res = await request(app)
      .post("/api/github/repos/myorg/my-repo/workflows/ci.yml/dispatch")
      .send({ ref: "main", inputs: {} });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not connected/i);
  });

  it("returns 200 when workflow dispatch succeeds", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });

    const createWorkflowDispatchMock = jest.fn().mockResolvedValue({});
    // Re-mock Octokit to include actions.createWorkflowDispatch
    (mockRest as any).actions.createWorkflowDispatch = createWorkflowDispatchMock;

    const res = await request(app)
      .post("/api/github/repos/myorg/my-repo/workflows/ci.yml/dispatch")
      .send({ ref: "main", inputs: {} });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── GET /api/github/repos/:owner/:repo/branches ──────────────────────────────

describe("GET /api/github/repos/:owner/:repo/branches", () => {
  it("returns 200 with branch names from GitHub", async () => {
    (mockRest.repos as any).listBranches = jest.fn().mockResolvedValue({
      data: [{ name: "main" }, { name: "develop" }],
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/branches",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["main", "develop"]);
  });

  it("returns 500 when GitHub API fails for branches", async () => {
    (mockRest.repos as any).listBranches = jest.fn().mockRejectedValue(
      new Error("GitHub Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/branches",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/branches/i);
  });
});

// ── GET /api/github/repos — additional coverage ───────────────────────────────

describe("GET /api/github/repos — additional coverage", () => {
  it("returns 403 when GitHub returns 403 (SSO/scope issue)", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid",
      githubUsername: "testuser",
    });
    listForAuthenticatedUserMock.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { status: 403 }),
    );

    const res = await request(app).get("/api/github/repos");

    expect(res.status).toBe(403);
    expect(res.body.requiresReconnect).toBe(true);
  });
});

// ── GET /api/github/repos/:owner/:repo/deployment-services ───────────────────

describe("GET /api/github/repos/:owner/:repo/deployment-services", () => {
  it("returns 200 with detection results when all GitHub APIs succeed", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockResolvedValue({
      data: { workflows: [{ state: "active" }] },
    });
    (mockRest.repos.listDeployments as jest.Mock).mockResolvedValue({
      data: [],
    });
    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });
    (mockRest.git.getTree as jest.Mock).mockResolvedValue({
      data: {
        tree: [
          { type: "blob", path: "vercel.json" },
          { type: "blob", path: "src/index.ts" },
        ],
      },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployment-services",
    );

    expect(res.status).toBe(200);
    expect(res.body.githubActions.used).toBe(true);
    expect(res.body.vercel.used).toBe(true);
    expect(res.body.render.used).toBe(false);
  });

  it("returns 200 with all services unavailable when no workflows, deployments, or config files exist", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockResolvedValue({
      data: { workflows: [] },
    });
    (mockRest.repos.listDeployments as jest.Mock).mockResolvedValue({
      data: [],
    });
    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });
    (mockRest.git.getTree as jest.Mock).mockResolvedValue({
      data: { tree: [] },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployment-services",
    );

    expect(res.status).toBe(200);
    expect(res.body.githubActions.used).toBe(false);
    expect(res.body.vercel.used).toBe(false);
    expect(res.body.render.used).toBe(false);
    expect(res.body.githubActions.status).toBe("available");
  });

  it("returns 500 when GitHub API throws", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockRejectedValue(
      new Error("API Error"),
    );

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployment-services",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/deployment services/i);
  });

  it("detects render via deployment signal when render config file is absent", async () => {
    (mockRest.actions.listRepoWorkflows as jest.Mock).mockResolvedValue({
      data: { workflows: [] },
    });
    (mockRest.repos.listDeployments as jest.Mock).mockResolvedValue({
      data: [{ task: "render-deploy", description: null, creator: null }],
    });
    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });
    (mockRest.git.getTree as jest.Mock).mockResolvedValue({
      data: { tree: [] },
    });

    const res = await request(app).get(
      "/api/github/repos/myorg/my-repo/deployment-services",
    );

    expect(res.status).toBe(200);
    expect(res.body.render.used).toBe(true);
  });
});

// ── GET /api/gitops/repos/:owner/:repo/health ────────────────────────────────

describe("GET /api/gitops/repos/:owner/:repo/health", () => {
  it("returns 401 when GITHUB_TOKEN env var is not set (test environment)", async () => {
    // In tests, process.env.GITHUB_TOKEN is undefined, so githubToken becomes
    // the string "undefined" — the route returns 401 immediately
    const res = await request(app).get(
      "/api/gitops/repos/myorg/my-repo/health",
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token not found/i);
  });
});

// ── POST /api/gitops/repos/:owner/:repo/fix/:actionType ─────────────────────

describe("POST /api/gitops/repos/:owner/:repo/fix/:actionType", () => {
  it("returns 401 when GITHUB_TOKEN env var is not set", async () => {
    const res = await request(app).post(
      "/api/gitops/repos/myorg/my-repo/fix/enable-branch-protection",
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token not found/i);
  });
});

// ── POST /api/gitops/setup/workflow ──────────────────────────────────────────

describe("POST /api/gitops/setup/workflow", () => {
  it("returns 400 when required body fields are missing", async () => {
    const res = await request(app)
      .post("/api/gitops/setup/workflow")
      .send({ owner: "myorg" }); // missing repo and service

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 401 when the user has not connected their GitHub account", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: null,
      githubUsername: null,
    });

    const res = await request(app)
      .post("/api/gitops/setup/workflow")
      .send({ owner: "myorg", repo: "my-repo", service: "vercel" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/github not connected/i);
  });

  it("returns 200 with PR URL after successfully creating branch and committing workflow", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });

    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });
    (mockRest.git.getRef as jest.Mock).mockResolvedValue({
      data: { object: { sha: "abc123sha" } },
    });
    // deleteRef may throw (branch doesn't exist) — that's caught and ignored
    (mockRest.git.deleteRef as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );
    (mockRest.git.createRef as jest.Mock).mockResolvedValue({});
    (mockRest.repos.createOrUpdateFileContents as jest.Mock).mockResolvedValue({});
    (mockRest.pulls.create as jest.Mock).mockResolvedValue({
      data: { html_url: "https://github.com/myorg/my-repo/pull/42" },
    });

    const res = await request(app)
      .post("/api/gitops/setup/workflow")
      .send({ owner: "myorg", repo: "my-repo", service: "vercel" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.prUrl).toContain("pull/42");
  });

  it("returns 200 with PR URL for render service", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });

    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });
    (mockRest.git.getRef as jest.Mock).mockResolvedValue({
      data: { object: { sha: "def456sha" } },
    });
    (mockRest.git.deleteRef as jest.Mock).mockResolvedValue({});
    (mockRest.git.createRef as jest.Mock).mockResolvedValue({});
    (mockRest.repos.createOrUpdateFileContents as jest.Mock).mockResolvedValue({});
    (mockRest.pulls.create as jest.Mock).mockResolvedValue({
      data: { html_url: "https://github.com/myorg/my-repo/pull/43" },
    });

    const res = await request(app)
      .post("/api/gitops/setup/workflow")
      .send({ owner: "myorg", repo: "my-repo", service: "render" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 500 when step 1 (repos.get) fails", async () => {
    findUniqueMock.mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });

    (mockRest.repos.get as jest.Mock).mockRejectedValue(
      new Error("Repository not found"),
    );

    const res = await request(app)
      .post("/api/gitops/setup/workflow")
      .send({ owner: "myorg", repo: "missing-repo", service: "vercel" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/step 1/i);
  });
});
