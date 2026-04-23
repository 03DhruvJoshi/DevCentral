/**
 * Tests for auditMiddleware.ts
 * Covers:
 *   resolveAction  — maps HTTP method + path to a human-readable action string
 *   auditMiddleware — intercepts mutating responses and writes audit logs
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Prisma mock ───────────────────────────────────────────────────────────────

const auditLogCreate = jest.fn().mockResolvedValue({});

const db = {
  auditLog: { create: jest.fn(() => ({ catch: jest.fn() })) },
};

jest.unstable_mockModule("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(() => ({})),
}));

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/client",
  () => ({
    PrismaClient: jest.fn(() => db),
  }),
);

// ── Dynamic import ────────────────────────────────────────────────────────────

const { auditMiddleware } = await import("./auditMiddleware");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: {
  method?: string;
  path?: string;
  user?: { id: string; email: string; role: string } | null;
}) {
  return {
    method: overrides.method ?? "POST",
    path: overrides.path ?? "/api/auth/register",
    headers: {},
    user: overrides.user !== undefined
      ? overrides.user
      : { id: "u1", email: "user@test.com", role: "DEV" },
  } as any;
}

function makeRes(statusCode = 200) {
  const res: any = {
    statusCode,
    json: jest.fn(function (body: unknown) { return body; }),
  };
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ── GET requests are passed through without interception ──────────────────────

describe("auditMiddleware — non-mutating requests", () => {
  it("calls next() immediately for GET requests without wrapping res.json", () => {
    const req = makeReq({ method: "GET", path: "/api/admin/users" });
    const res = makeRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    // res.json should not have been replaced
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("calls next() for admin config paths (self-logging) without wrapping", () => {
    const req = makeReq({ method: "POST", path: "/api/admin/config/SOME_FLAG" });
    const res = makeRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
});

// ── POST / PUT / PATCH / DELETE requests are intercepted ─────────────────────

describe("auditMiddleware — mutating requests", () => {
  it("wraps res.json and writes an audit log for a successful (2xx) authenticated POST", () => {
    const req = makeReq({ method: "POST", path: "/api/auth/register" });
    const res = makeRes(201);
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    // Simulate Express calling the (now-wrapped) res.json
    res.json({ message: "Created" });

    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("USER_REGISTERED");
    expect(callArg.data.actorEmail).toBe("user@test.com");
  });

  it("does NOT write an audit log when statusCode is 4xx", () => {
    const req = makeReq({ method: "POST", path: "/api/auth/register" });
    const res = makeRes(400);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ error: "Bad request" });

    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("does NOT write an audit log when req.user is absent (unauthenticated mutation)", () => {
    const req = makeReq({ method: "POST", path: "/api/auth/register", user: null });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("maps POST /api/scaffold/* to TEMPLATE_DEPLOYED action", () => {
    const req = makeReq({ method: "POST", path: "/api/scaffold/execute" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ url: "https://github.com/..." });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("TEMPLATE_DEPLOYED");
  });

  it("maps PUT /api/dashboard/preferences to DASHBOARD_UPDATED action", () => {
    const req = makeReq({ method: "PUT", path: "/api/dashboard/preferences" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("DASHBOARD_UPDATED");
  });

  it("maps POST /api/github/* to GITOPS_ACTION action", () => {
    const req = makeReq({ method: "POST", path: "/api/github/repos/owner/repo/dispatch" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("GITOPS_ACTION");
  });

  it("maps PATCH /api/admin/users/:id to USER_UPDATED action", () => {
    const req = makeReq({ method: "PATCH", path: "/api/admin/users/abc123" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("USER_UPDATED");
  });

  it("falls back to METHOD:path for unmapped routes", () => {
    const req = makeReq({ method: "DELETE", path: "/api/some/other/thing" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("DELETE:/api/some/other/thing");
  });

  it("handles POST /scaffold/* (without /api prefix) as TEMPLATE_CREATED", () => {
    const req = makeReq({ method: "POST", path: "/scaffold/new-template" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("TEMPLATE_CREATED");
  });

  it("handles DELETE /scaffold/* as TEMPLATE_DELETED", () => {
    const req = makeReq({ method: "DELETE", path: "/scaffold/123" });
    const res = makeRes(200);
    const next = jest.fn();

    auditMiddleware(req, res, next);
    res.json({ ok: true });

    const callArg = (db.auditLog.create as jest.Mock).mock.calls[0][0] as any;
    expect(callArg.data.action).toBe("TEMPLATE_DELETED");
  });
});
