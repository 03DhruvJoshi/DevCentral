/**
 * Tests for authenticatetoken.ts — JWT middleware
 * Functions covered:
 *   authenticateToken — validates Bearer JWT from Authorization header
 *   requireAdmin     — enforces ADMIN role
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── JWT mock ──────────────────────────────────────────────────────────────────

const jwtVerifyMock = jest.fn();

jest.unstable_mockModule("jsonwebtoken", () => {
  const mod = { verify: jwtVerifyMock };
  return { default: mod, ...mod };
});

// ── Dynamic import ────────────────────────────────────────────────────────────

const { authenticateToken, requireAdmin } = await import("./authenticatetoken");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMocks(overrides: { headers?: Record<string, string> } = {}) {
  const req: any = {
    headers: overrides.headers ?? {},
    user: undefined,
  };
  const json = jest.fn();
  const status = jest.fn(() => ({ json })) as any;
  const res: any = { status, json };
  const next = jest.fn();
  return { req, res, next, json, status };
}

beforeEach(() => jest.clearAllMocks());

// ── authenticateToken ─────────────────────────────────────────────────────────

describe("authenticateToken", () => {
  it("calls next() and sets req.user when the JWT is valid", () => {
    const { req, res, next } = makeMocks({
      headers: { authorization: "Bearer valid.token.here" },
    });

    jwtVerifyMock.mockImplementation(
      (_token: string, _secret: string, cb: Function) => {
        cb(null, { id: "u1", email: "user@test.com", role: "DEV" });
      },
    );

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: "u1", email: "user@test.com", role: "DEV" });
  });

  it("returns 401 when no Authorization header is present", () => {
    const { req, res, next } = makeMocks({ headers: {} });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header has no token (empty Bearer)", () => {
    const { req, res, next } = makeMocks({
      headers: { authorization: "Bearer " },
    });

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the JWT is expired or invalid", () => {
    const { req, res, next } = makeMocks({
      headers: { authorization: "Bearer bad.token" },
    });

    jwtVerifyMock.mockImplementation(
      (_token: string, _secret: string, cb: Function) => {
        cb(new Error("jwt expired"), undefined);
      },
    );

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when jwt.verify resolves with a plain string (invalid payload)", () => {
    const { req, res, next } = makeMocks({
      headers: { authorization: "Bearer some.token" },
    });

    jwtVerifyMock.mockImplementation(
      (_token: string, _secret: string, cb: Function) => {
        cb(null, "just-a-string");
      },
    );

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when jwt.verify resolves with undefined", () => {
    const { req, res, next } = makeMocks({
      headers: { authorization: "Bearer some.token" },
    });

    jwtVerifyMock.mockImplementation(
      (_token: string, _secret: string, cb: Function) => {
        cb(null, undefined);
      },
    );

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  it("calls next() when the authenticated user has the ADMIN role", () => {
    const { req, res, next } = makeMocks();
    req.user = { id: "a1", email: "admin@test.com", role: "ADMIN" };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when req.user is undefined (unauthenticated request)", () => {
    const { req, res, next } = makeMocks();
    req.user = undefined;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user has the DEV role", () => {
    const { req, res, next } = makeMocks();
    req.user = { id: "d1", email: "dev@test.com", role: "DEV" };

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
