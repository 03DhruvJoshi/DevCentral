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

const mockRest = {
  pulls: { list: jest.fn() },
  repos: { listCommits: jest.fn() },
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "user-id", email: "user@test.com", role: "DEV" };
    next();
  }),
}));

jest.unstable_mockModule("../../prisma", () => ({
  default: {},
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
});
