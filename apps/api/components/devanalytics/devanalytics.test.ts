/**
 * Tests for devanalytics.ts — SonarCloud & GitHub velocity analytics
 * Routes covered:
 *   GET /api/analytics/sonar/:owner/:repo     — code-quality metrics
 *   GET /api/analytics/velocity/:owner/:repo  — PR throughput & review stats
 */
import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock instances ─────────────────────────────────────────────────────

const db = {
  providerIntegration: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

const mockRest = {
  pulls: { list: jest.fn(), get: jest.fn(), listReviews: jest.fn() },
  repos: { listCommits: jest.fn(), get: jest.fn() },
  actions: {
    listWorkflowRunsForRepo: jest.fn(),
    listJobsForWorkflowRun: jest.fn(),
  },
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "user-id", email: "user@test.com", role: "DEV" };
    next();
  }),
}));

jest.unstable_mockModule("../../prisma", () => ({
  default: db,
}));

jest.unstable_mockModule("octokit", () => ({
  Octokit: jest.fn(() => ({ rest: mockRest })),
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./devanalytics");

// ── Test app ──────────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

const app = express();
app.use(express.json());
app.use(router as any);

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn() as any;
});

afterAll(() => {
  global.fetch = originalFetch;
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("GET /api/analytics/sonar/:owner/:repo", () => {
  it("returns 200 with a metric key-value map on a successful SonarCloud response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        component: {
          measures: [
            { metric: "bugs", value: "3" },
            { metric: "coverage", value: "78.5" },
          ],
        },
      }),
    });

    const res = await request(app).get("/api/analytics/sonar/myorg/my-repo");

    expect(res.status).toBe(200);
    expect(res.body.bugs).toBe("3");
    expect(res.body.coverage).toBe("78.5");
  });

  it("returns 404 when SonarCloud cannot find the requested project key", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const res = await request(app).get(
      "/api/analytics/sonar/myorg/unknown-repo",
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 500 when SonarCloud returns a malformed 500 response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const res = await request(app).get("/api/analytics/sonar/myorg/my-repo");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/sonarqube/i);
  });
});

describe("GET /api/analytics/velocity/:owner/:repo", () => {
  it("returns 200 with velocity metrics when GitHub returns valid PR lists", async () => {
    (mockRest.pulls.list as jest.Mock).mockResolvedValue({ data: [] });

    const res = await request(app).get(
      "/api/analytics/velocity/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("throughput");
    expect(res.body).toHaveProperty("summary");
  });

  it("returns 500 when GitHub returns a 403 rate-limit error via Octokit", async () => {
    (mockRest.pulls.list as jest.Mock).mockRejectedValue(
      Object.assign(new Error("API rate limit exceeded for user"), {
        status: 403,
      }),
    );

    const res = await request(app).get(
      "/api/analytics/velocity/myorg/my-repo",
    );

    expect(res.status).toBe(500);
  });

  it("returns 500 when Octokit resolves with a missing data field (malformed response)", async () => {
    // Destructuring `{ data }` from `{}` yields undefined — downstream .filter() crashes
    (mockRest.pulls.list as jest.Mock).mockResolvedValue({});

    const res = await request(app).get(
      "/api/analytics/velocity/myorg/my-repo",
    );

    expect(res.status).toBe(500);
  });

  it("returns 200 with review stats when merged PRs have review data", async () => {
    const now = new Date();
    const mergedAt = new Date(now.getTime() - 86_400_000).toISOString();
    const createdAt = new Date(now.getTime() - 2 * 86_400_000).toISOString();

    const mergedPR = {
      number: 10,
      title: "feat: big feature",
      html_url: "https://github.com/myorg/my-repo/pull/10",
      user: { login: "alice", id: 1 },
      state: "closed",
      draft: false,
      created_at: createdAt,
      updated_at: mergedAt,
      merged_at: mergedAt,
      additions: 100,
      deletions: 20,
      changed_files: 5,
      commits: 3,
      comments: 1,
      review_comments: 2,
      base: { ref: "main" },
      head: { ref: "feature/big" },
    };

    // First call: open PRs; second call: closed PRs
    (mockRest.pulls.list as jest.Mock)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [mergedPR] });

    // listReviews for the merged PR
    (mockRest.pulls.listReviews as jest.Mock).mockResolvedValue({
      data: [
        {
          user: { login: "bob", id: 2 },
          state: "APPROVED",
          submitted_at: new Date(now.getTime() - 90_000_000).toISOString(),
        },
      ],
    });

    // pulls.get (full PR data)
    (mockRest.pulls.get as jest.Mock).mockResolvedValue({
      data: {
        ...mergedPR,
        base: { ref: "main" },
        head: { ref: "feature/big" },
        merged_at: mergedAt,
      },
    });

    const res = await request(app).get(
      "/api/analytics/velocity/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("throughput");
    expect(res.body).toHaveProperty("summary");
  });
});

// ── GET /api/analytics/sonar/:owner/:repo/issues ─────────────────────────────

describe("GET /api/analytics/sonar/:owner/:repo/issues", () => {
  it("returns 200 with issues summary when SonarCloud returns issues", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        paging: { total: 2 },
        issues: [
          { key: "i1", severity: "CRITICAL", type: "BUG", component: "src/index.ts", rule: "rule1" },
          { key: "i2", severity: "MAJOR", type: "CODE_SMELL", component: "src/utils.ts", rule: "rule2" },
        ],
      }),
    });

    const res = await request(app).get(
      "/api/analytics/sonar/myorg/my-repo/issues",
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.bySeverity).toBeDefined();
    expect(res.body.byType).toBeDefined();
  });

  it("returns 404 when SonarCloud cannot find the project issues", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const res = await request(app).get(
      "/api/analytics/sonar/myorg/unknown-repo/issues",
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 500 when SonarCloud returns a server error for issues", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const res = await request(app).get(
      "/api/analytics/sonar/myorg/my-repo/issues",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/sonarqube/i);
  });
});

// ── GET /api/analytics/cicd/:owner/:repo ─────────────────────────────────────

describe("GET /api/analytics/cicd/:owner/:repo", () => {
  it("returns 200 with CI/CD analytics when GitHub returns workflow run data", async () => {
    // No run_started_at means duration_min is null — no slow-run job lookups triggered
    (mockRest.actions.listWorkflowRunsForRepo as jest.Mock).mockResolvedValue({
      data: {
        workflow_runs: [
          {
            id: 1,
            name: "CI",
            head_branch: "main",
            event: "push",
            status: "completed",
            conclusion: "success",
            actor: { login: "testuser" },
            head_sha: "abc123",
            run_started_at: null,
            created_at: "2024-01-01T09:59:00Z",
            updated_at: "2024-01-01T10:05:00Z",
            html_url: "https://github.com/...",
          },
        ],
      },
    });
    (mockRest.repos.get as jest.Mock).mockResolvedValue({
      data: { default_branch: "main" },
    });

    const res = await request(app).get(
      "/api/analytics/cicd/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.run_register).toBeDefined();
  });

  it("returns 500 when GitHub API fails for CI/CD analytics", async () => {
    (mockRest.actions.listWorkflowRunsForRepo as jest.Mock).mockRejectedValue(
      new Error("GitHub API Error"),
    );

    const res = await request(app).get(
      "/api/analytics/cicd/myorg/my-repo",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed/i);
  });
});

// ── GET /api/integrations/status ─────────────────────────────────────────────

describe("GET /api/integrations/status", () => {
  it("returns 200 with integration status for both providers", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      {
        provider: "vercel",
        teamId: null,
        connectedAt: new Date("2024-01-01"),
      },
    ]);

    const res = await request(app).get("/api/integrations/status");

    expect(res.status).toBe(200);
    expect(res.body.vercel.connected).toBe(true);
    expect(res.body.render.connected).toBe(false);
  });

  it("returns 500 when database fails for integration status", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await request(app).get("/api/integrations/status");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed/i);
  });
});

// ── POST /api/integrations/:provider/connect ──────────────────────────────────

describe("POST /api/integrations/:provider/connect", () => {
  it("returns 400 for unsupported provider", async () => {
    const res = await request(app)
      .post("/api/integrations/aws/connect")
      .send({ apiToken: "tok_somevalidtoken12345" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported provider/i);
  });

  it("returns 400 when API token is too short", async () => {
    const res = await request(app)
      .post("/api/integrations/vercel/connect")
      .send({ apiToken: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid api token/i);
  });

  it("returns 401 when Vercel token validation fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    const res = await request(app)
      .post("/api/integrations/vercel/connect")
      .send({ apiToken: "tok_invalid_vercel_token_12345" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/vercel token/i);
  });

  it("returns 200 when Vercel token is valid and integration is saved", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (db.providerIntegration.upsert as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/api/integrations/vercel/connect")
      .send({ apiToken: "tok_valid_vercel_token_here_xyz" });

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.provider).toBe("vercel");
  });

  it("returns 401 when Render token validation fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    const res = await request(app)
      .post("/api/integrations/render/connect")
      .send({ apiToken: "rnd_invalid_render_key_12345" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/render api key/i);
  });

  it("returns 200 when Render token is valid and integration is saved", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    (db.providerIntegration.upsert as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/api/integrations/render/connect")
      .send({ apiToken: "rnd_valid_render_key_here_xyz" });

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.provider).toBe("render");
  });
});
