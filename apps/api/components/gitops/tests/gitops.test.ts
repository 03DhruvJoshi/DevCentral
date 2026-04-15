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

import type { AuthenticatedRequest } from "../../../api_types/index.js";

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
  },
  pulls: { list: jest.fn() },
  actions: {
    listWorkflowRunsForRepo: jest.fn(),
    listRepoWorkflows: jest.fn(),
  },
  issues: { listForRepo: jest.fn() },
  git: { getTree: jest.fn() },
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

jest.unstable_mockModule("../../auth/authenticatetoken", () => ({
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

jest.unstable_mockModule("../../../prisma", () => ({
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

const { default: router } = await import("../gitops.js");

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
