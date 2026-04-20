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
});
