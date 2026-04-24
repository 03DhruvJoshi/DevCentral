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
    count: jest.fn(),
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

// ── PATCH /api/admin/users/bulk ───────────────────────────────────────────────

describe("PATCH /api/admin/users/bulk", () => {
  it("returns 200 and updates users for a valid SUSPEND action", async () => {
    (db.user.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (db.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .patch("/api/admin/users/bulk")
      .send({ userIds: ["u1", "u2"], action: "SUSPEND" });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.message).toMatch(/suspend/i);
  });

  it("returns 400 when userIds is an empty array", async () => {
    const res = await request(app)
      .patch("/api/admin/users/bulk")
      .send({ userIds: [], action: "SUSPEND" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty/i);
  });

  it("returns 400 when action is not valid", async () => {
    const res = await request(app)
      .patch("/api/admin/users/bulk")
      .send({ userIds: ["u1"], action: "INVALID_ACTION" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid action/i);
  });

  it("excludes the requesting admin's own ID from the bulk operation", async () => {
    (db.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .patch("/api/admin/users/bulk")
      .send({ userIds: ["admin-id", "u2"], action: "DEMOTE" });

    expect(res.status).toBe(200);
    expect(res.body.selfExcluded).toBe(true);
    expect(res.body.count).toBe(1);
  });

  it("returns 500 when the database throws during bulk update", async () => {
    (db.user.updateMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .patch("/api/admin/users/bulk")
      .send({ userIds: ["u1"], action: "ACTIVATE" });

    expect(res.status).toBe(500);
  });
});

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────

describe("PATCH /api/admin/users/:id", () => {
  it("returns 200 when user is updated with new role", async () => {
    (db.user.update as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "user@test.com",
      role: "ADMIN",
    });

    const res = await request(app)
      .patch("/api/admin/users/u1")
      .send({ role: "ADMIN" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  it("returns 400 when admin tries to modify their own account", async () => {
    const res = await request(app)
      .patch("/api/admin/users/admin-id")
      .send({ role: "DEV" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own administrative account/i);
  });
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────────────────────

describe("PUT /api/admin/users/:id/role", () => {
  it("returns 200 when user role is updated", async () => {
    (db.user.update as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "user@test.com",
      role: "ADMIN",
    });

    const res = await request(app)
      .put("/api/admin/users/u1/role")
      .send({ newRole: "ADMIN" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/admin/i);
  });

  it("returns 400 when admin tries to change their own role", async () => {
    const res = await request(app)
      .put("/api/admin/users/admin-id/role")
      .send({ newRole: "DEV" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own role/i);
  });

  it("returns 500 when database update fails", async () => {
    (db.user.update as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .put("/api/admin/users/u1/role")
      .send({ newRole: "DEV" });

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/analytics ──────────────────────────────────────────────────

describe("GET /api/admin/analytics", () => {
  it("returns 200 with aggregated platform metrics", async () => {
    (db.user.count as jest.Mock).mockResolvedValue(10);
    (db.template.count as jest.Mock).mockResolvedValue(5);
    (db.user.findMany as jest.Mock).mockResolvedValue([
      { name: "Alice", createdAt: new Date() },
    ]);

    const res = await request(app).get("/api/admin/analytics");

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalUsers).toBe(10);
  });

  it("returns 500 when the database fails during analytics fetch", async () => {
    (db.user.count as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/admin/analytics");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────

describe("GET /api/admin/audit-logs", () => {
  it("returns 200 with paginated audit logs", async () => {
    (db.auditLog.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        createdAt: new Date(),
        actorEmail: "admin@test.com",
        action: "USER_UPDATED",
        targetId: "/api/admin/users/u1",
        role: "ADMIN",
        details: null,
      },
    ]);
    (db.auditLog.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get("/api/admin/audit-logs");

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it("returns 200 with filtered results when action=OTHER", async () => {
    (db.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (db.auditLog.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app).get(
      "/api/admin/audit-logs?action=OTHER&page=2&limit=10",
    );

    expect(res.status).toBe(200);
    expect(res.body.logs).toEqual([]);
  });

  it("returns 500 when the database throws during audit log fetch", async () => {
    (db.auditLog.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));
    (db.auditLog.count as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/admin/audit-logs");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/config ─────────────────────────────────────────────────────

describe("GET /api/admin/config", () => {
  it("returns 200 with platform configuration entries", async () => {
    (db.platformConfig.findMany as jest.Mock).mockResolvedValue([
      { key: "SCAFFOLDER_ENABLED", value: "true" },
    ]);

    const res = await request(app).get("/api/admin/config");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].key).toBe("SCAFFOLDER_ENABLED");
  });

  it("returns 500 when the database fails during config fetch", async () => {
    (db.platformConfig.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await request(app).get("/api/admin/config");

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/admin/config/:key ────────────────────────────────────────────────

describe("PUT /api/admin/config/:key", () => {
  it("returns 200 when config is upserted successfully", async () => {
    (db.platformConfig.upsert as jest.Mock).mockResolvedValue({
      key: "SCAFFOLDER_ENABLED",
      value: "false",
    });
    (db.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .put("/api/admin/config/SCAFFOLDER_ENABLED")
      .send({ value: "false" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/saved/i);
    expect(res.body.config.value).toBe("false");
  });

  it("returns 500 when the database throws during config upsert", async () => {
    (db.platformConfig.upsert as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await request(app)
      .put("/api/admin/config/SOME_KEY")
      .send({ value: "true" });

    expect(res.status).toBe(500);
  });
});

// ── DELETE /api/admin/config/:key ─────────────────────────────────────────────

describe("DELETE /api/admin/config/:key", () => {
  it("returns 200 when config is deleted successfully", async () => {
    (db.platformConfig.delete as jest.Mock).mockResolvedValue({});
    (db.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await request(app).delete("/api/admin/config/SOME_KEY");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("returns 500 when the database throws during config deletion", async () => {
    (db.platformConfig.delete as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await request(app).delete("/api/admin/config/SOME_KEY");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/platform/features ────────────────────────────────────────────────

describe("GET /api/platform/features", () => {
  it("returns 200 with a flat key-value feature map", async () => {
    (db.platformConfig.findMany as jest.Mock).mockResolvedValue([
      { key: "SCAFFOLDER_ENABLED", value: "true" },
      { key: "GITOPS_ENABLED", value: "false" },
    ]);

    const res = await request(app).get("/api/platform/features");

    expect(res.status).toBe(200);
    expect(res.body.SCAFFOLDER_ENABLED).toBe("true");
    expect(res.body.GITOPS_ENABLED).toBe("false");
  });

  it("returns 500 when the database fails", async () => {
    (db.platformConfig.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await request(app).get("/api/platform/features");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/users/export ───────────────────────────────────────────────

describe("GET /api/admin/users/export", () => {
  it("returns a CSV file with user data", async () => {
    (db.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        email: "alice@test.com",
        githubUsername: "alicedev",
        role: "DEV",
        status: "ACTIVE",
        createdAt: new Date("2024-01-01"),
      },
    ]);

    const res = await request(app).get("/api/admin/users/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/i);
    expect(res.text).toContain("alice@test.com");
  });

  it("returns 500 when the database fails during CSV export", async () => {
    (db.user.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/admin/users/export");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/audit-logs/export ─────────────────────────────────────────

describe("GET /api/admin/audit-logs/export", () => {
  it("returns a CSV file with audit log data", async () => {
    (db.auditLog.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        createdAt: new Date("2024-01-01"),
        actorEmail: "admin@test.com",
        action: "USER_UPDATED",
        targetId: "/api/admin/users/u1",
        role: "ADMIN",
        details: null,
      },
    ]);

    const res = await request(app).get("/api/admin/audit-logs/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/i);
    expect(res.text).toContain("admin@test.com");
  });

  it("returns 500 when the database fails during audit log CSV export", async () => {
    (db.auditLog.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/admin/audit-logs/export");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/admin/analytics/detailed ────────────────────────────────────────

describe("GET /api/admin/analytics/detailed", () => {
  it("returns 200 with detailed analytics data", async () => {
    (db.user.count as jest.Mock).mockResolvedValue(20);
    (db.template.count as jest.Mock).mockResolvedValue(8);
    (db.category.count as jest.Mock).mockResolvedValue(3);
    (db.auditLog.count as jest.Mock).mockResolvedValue(50);
    (db.auditLog.findMany as jest.Mock).mockResolvedValue([]);
    (db.platformConfig.count as jest.Mock).mockResolvedValue(5);

    const res = await request(app).get("/api/admin/analytics/detailed");

    expect(res.status).toBe(200);
    expect(res.body.userStats).toBeDefined();
    expect(res.body.contentStats).toBeDefined();
    expect(res.body.auditStats).toBeDefined();
  });

  it("returns 500 when the database fails during detailed analytics", async () => {
    (db.user.count as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/admin/analytics/detailed");

    expect(res.status).toBe(500);
  });
});
