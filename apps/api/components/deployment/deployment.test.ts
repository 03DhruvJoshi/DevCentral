/**
 * Tests for deployment.ts — Vercel/Render deployment analytics
 * Routes covered:
 *   GET /api/analytics/deployments/:owner/:repo
 */
import { jest, describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock DB instance ───────────────────────────────────────────────────

const db = {
  providerIntegration: {
    findMany: jest.fn(),
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

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./deployment");

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

describe("GET /api/analytics/deployments/:owner/:repo", () => {
  it("returns 200 with noIntegrations flag when user has no connected providers", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.noIntegrations).toBe(true);
    expect(res.body.deployments).toEqual([]);
  });

  it("returns 400 when owner or repo contains invalid characters (spaces)", async () => {
    // isValidRepoParam rejects values with spaces — /^[A-Za-z0-9_.-]+$/ must match
    const res = await request(app).get(
      "/api/analytics/deployments/my org/my repo",
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 500 when the database throws while fetching provider integrations", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockRejectedValue(
      new Error("Neon serverless: connection terminated unexpectedly"),
    );

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed/i);
  });

  it("returns 200 with deployment data when Vercel API responds successfully", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: null },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        deployments: [
          {
            uid: "dpl_1",
            name: "my-repo",
            url: "my-repo.vercel.app",
            state: "READY",
            createdAt: Date.now() - 60_000,
            buildingAt: Date.now() - 120_000,
            ready: Date.now() - 30_000,
            target: "production",
            meta: {
              githubCommitRef: "main",
              githubCommitRepo: "myorg/my-repo",
              githubCommitSha: "abc123",
              githubCommitMessage: "fix: patch bug",
            },
          },
        ],
      }),
    });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(1);
  });

  it("returns 200 with empty deploys when Vercel returns a 500 (graceful per-provider fallback)", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: null },
    ]);

    // Vercel API responds with a non-OK status — route catches this per-provider
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(0);
  });

  it("returns 200 when Vercel throws a network-level ECONNRESET (graceful fallback)", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: null },
    ]);

    (global.fetch as jest.Mock).mockRejectedValue(
      new Error("ECONNRESET: socket hang up"),
    );

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(0);
  });

  it("returns 200 with all Vercel status states mapped correctly (ERROR, CANCELED, BUILDING)", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: null },
    ]);

    const now = Date.now();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        deployments: [
          {
            uid: "dpl_err",
            name: "my-repo",
            url: "my-repo.vercel.app",
            state: "ERROR",
            createdAt: now - 300_000,
            buildingAt: now - 350_000,
            ready: null,
            target: "production",
            meta: { githubCommitRef: "main", githubCommitRepo: "myorg/my-repo", githubCommitSha: "abc", githubCommitMessage: "fix" },
          },
          {
            uid: "dpl_canceled",
            name: "my-repo",
            url: "my-repo.vercel.app",
            state: "CANCELED",
            createdAt: now - 400_000,
            buildingAt: null,
            ready: null,
            target: null,
            meta: { githubCommitRepo: "myorg/my-repo" },
          },
          {
            uid: "dpl_building",
            name: "my-repo",
            url: "my-repo.vercel.app",
            state: "INITIALIZING",
            createdAt: now - 100_000,
            buildingAt: null,
            ready: null,
            target: "staging",
            meta: { githubCommitRepo: "myorg/my-repo" },
          },
        ],
      }),
    });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(3);
    expect(res.body.summary.successRate).toBe(0);
  });

  it("returns 200 with Render integration data when Render API responds successfully", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "render", apiToken: "rnd_tok_render", teamId: null },
    ]);

    // First call: list services
    const servicesResponse = [
      {
        service: {
          id: "svc_123",
          name: "my-repo",
          slug: "my-repo",
          repo: "https://github.com/myorg/my-repo",
          branch: "main",
          dashboardUrl: "https://dashboard.render.com/...",
          type: "web_service",
        },
        cursor: null,
      },
    ];

    // Second call: list deploys for the service
    const now = new Date();
    const deploysResponse = [
      {
        deploy: {
          id: "dep_abc",
          status: "live",
          createdAt: now.toISOString(),
          startedAt: now.toISOString(),
          finishedAt: new Date(now.getTime() + 60_000).toISOString(),
          commit: { id: "sha123", message: "fix: render deploy" },
        },
        cursor: null,
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => servicesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => deploysResponse,
      });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(1);
  });

  it("returns 200 with teamId query parameter passed to Vercel", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: "team_abc" },
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ deployments: [] }),
    });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.summary.totalDeploys).toBe(0);
    // Verify teamId was included in the URL
    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchUrl).toContain("teamId=team_abc");
  });

  it("returns 200 with both Vercel and Render when both integrations exist", async () => {
    (db.providerIntegration.findMany as jest.Mock).mockResolvedValue([
      { provider: "vercel", apiToken: "tok_vercel", teamId: null },
      { provider: "render", apiToken: "rnd_tok_render", teamId: null },
    ]);

    const now = Date.now();
    // Vercel call
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deployments: [
            {
              uid: "dpl_1",
              name: "my-repo",
              url: "my-repo.vercel.app",
              state: "READY",
              createdAt: now - 60_000,
              buildingAt: now - 120_000,
              ready: now - 30_000,
              target: "production",
              meta: { githubCommitRepo: "myorg/my-repo", githubCommitRef: "main", githubCommitSha: "abc", githubCommitMessage: "fix" },
            },
          ],
        }),
      })
      // Render services call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const res = await request(app).get(
      "/api/analytics/deployments/myorg/my-repo",
    );

    expect(res.status).toBe(200);
    expect(res.body.providerStats).toHaveLength(2);
  });
});
