/**
 * Tests for dashboard.ts — User dashboard preference routes
 * Routes covered:
 *   GET /api/dashboard/preferences — fetch saved widget layout
 *   PUT /api/dashboard/preferences — persist widget layout
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock DB instance ───────────────────────────────────────────────────

const db = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(() => ({})),
}));

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/client",
  () => ({
    PrismaClient: jest.fn(() => db),
  }),
);

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "user-id", email: "user@test.com", role: "DEV" };
    next();
  }),
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./dashboard");

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
// strict: false lets bare numbers/booleans through so our handler's guard is tested
app.use(express.json({ strict: false }));
app.use(router as any);

beforeEach(() => jest.clearAllMocks());

// ── Test suites ───────────────────────────────────────────────────────────────

describe("GET /api/dashboard/preferences", () => {
  it("returns 200 with the user's saved widget configuration", async () => {
    const prefs = { widgets: ["deployments", "repos", "analytics"] };
    (db.user.findUnique as jest.Mock).mockResolvedValue({ dashboardPreferences: prefs });

    const res = await request(app).get("/api/dashboard/preferences");

    expect(res.status).toBe(200);
    expect(res.body.widgets).toEqual(["deployments", "repos", "analytics"]);
  });

  it("returns 200 with a default empty widget list when the user has no preferences", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({ dashboardPreferences: null });

    const res = await request(app).get("/api/dashboard/preferences");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ widgets: [] });
  });

  it("returns 500 when the database times out during the preferences lookup", async () => {
    (db.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Query read timeout after 30s"),
    );

    const res = await request(app).get("/api/dashboard/preferences");

    expect(res.status).toBe(500);
  });
});

describe("PUT /api/dashboard/preferences", () => {
  it("returns 200 after successfully persisting a valid widget layout", async () => {
    (db.user.update as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .put("/api/dashboard/preferences")
      .send({ widgets: ["repos", "analytics"] });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/saved/i);
  });

  it("returns 400 when the request body is not a valid JSON object (e.g. a bare number)", async () => {
    // Sending a JSON number — req.body becomes 5 (typeof !== "object") → 400
    const res = await request(app)
      .put("/api/dashboard/preferences")
      .set("Content-Type", "application/json")
      .send("5");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 500 when the database write fails mid-save", async () => {
    (db.user.update as jest.Mock).mockRejectedValue(
      new Error("Write conflict on row lock"),
    );

    const res = await request(app)
      .put("/api/dashboard/preferences")
      .send({ widgets: ["repos"] });

    expect(res.status).toBe(500);
  });
});
