/**
 * Tests for admin.ts — Admin user management routes
 * Routes covered:
 *   GET    /api/admin/users       — search & list users
 *   DELETE /api/admin/users/:id   — remove a user
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock DB instance (captured by factory closures below) ──────────────

const db = {
  user: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  platformConfig: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  template: { count: jest.fn() },
  category: { count: jest.fn() },
};

// ── ESM module mocks (must be registered BEFORE await import) ─────────────────

jest.unstable_mockModule("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(() => ({})),
}));

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/client",
  () => ({
    PrismaClient: jest.fn(() => db),
    Prisma: { QueryMode: { insensitive: "insensitive" } },
    AuthTokenType: {},
  }),
);

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/runtime/client",
  () => ({}),
);

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "admin-id", email: "admin@test.com", role: "ADMIN" };
    next();
  }),
  requireAdmin: jest.fn((_req: any, _res: any, next: () => void) => next()),
}));

// ── Dynamic import (AFTER mocks are registered) ───────────────────────────────

const { default: router } = await import("./admin");

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(router as any);

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  it("returns 200 with a list of users when the DB responds successfully", async () => {
    (db.user.findMany as jest.Mock).mockResolvedValue([
      { id: "u1", email: "alice@test.com", role: "DEV", status: "ACTIVE", createdAt: new Date() },
    ]);

    const res = await request(app).get("/api/admin/users");

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].email).toBe("alice@test.com");
  });

  it("returns 200 with an empty array when no users match the search query", async () => {
    (db.user.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get("/api/admin/users?search=nobody");

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it("returns 500 when the database connection unexpectedly drops mid-query", async () => {
    (db.user.findMany as jest.Mock).mockRejectedValue(
      new Error("DB connection pool exhausted"),
    );

    const res = await request(app).get("/api/admin/users");

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("returns 200 and confirms removal when a valid non-self user ID is supplied", async () => {
    (db.user.delete as jest.Mock).mockResolvedValue({ id: "other-user-id" });

    const res = await request(app).delete("/api/admin/users/other-user-id");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  it("returns 400 when an admin attempts to delete their own account", async () => {
    // req.user.id === "admin-id" (set by the mock middleware)
    const res = await request(app).delete("/api/admin/users/admin-id");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own account/i);
    expect(db.user.delete as jest.Mock).not.toHaveBeenCalled();
  });

  it("returns 500 when the database throws a disk I/O error during deletion", async () => {
    (db.user.delete as jest.Mock).mockRejectedValue(new Error("Disk I/O failure"));

    const res = await request(app).delete("/api/admin/users/other-user-id");

    expect(res.status).toBe(500);
  });
});
