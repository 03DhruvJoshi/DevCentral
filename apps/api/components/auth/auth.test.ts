/**
 * Tests for auth.ts — Authentication routes
 * Routes covered:
 *   POST /api/auth/login     — credential-based sign-in
 *   POST /api/auth/register  — new account creation
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock instances ─────────────────────────────────────────────────────

const db = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  authToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: any) => Promise.all(ops)),
};

const bcryptMock = {
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed-password"),
  genSalt: jest.fn().mockResolvedValue("salt"),
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(() => ({})),
}));

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/client",
  () => ({
    PrismaClient: jest.fn(() => db),
    AuthTokenType: {
      EMAIL_VERIFY: "EMAIL_VERIFY",
      PASSWORD_RESET: "PASSWORD_RESET",
    },
  }),
);

// bcrypt is a CJS module imported as `import bcrypt from "bcrypt"` — the mock
// must provide a `default` export so the ESM→CJS interop resolves correctly.
jest.unstable_mockModule("bcrypt", () => ({ default: bcryptMock, ...bcryptMock }));

// jsonwebtoken is a CJS module — provide `default` for ESM interop
jest.unstable_mockModule("jsonwebtoken", () => {
  const mod = { sign: jest.fn(() => "fake-jwt-token"), verify: jest.fn() };
  return { default: mod, ...mod };
});

jest.unstable_mockModule("../email/email", () => ({
  sendVerificationOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("./authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "user-id", email: "user@test.com", role: "DEV" };
    next();
  }),
  requireAdmin: jest.fn((_req: any, _res: any, next: () => void) => next()),
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./auth");

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(router as any);

const VERIFIED_USER = {
  id: "u1",
  email: "alice@test.com",
  passwordHash: "hashed",
  emailVerified: true,
  status: "ACTIVE",
  role: "DEV",
  name: "Alice",
  githubUsername: null,
  dashboardPreferences: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (bcryptMock.hash as jest.Mock).mockResolvedValue("hashed-password");
  (bcryptMock.genSalt as jest.Mock).mockResolvedValue("salt");
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 with a JWT token when credentials are valid", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(VERIFIED_USER);
    (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.user.email).toBe("alice@test.com");
  });

  it("returns 400 when the password does not match the stored hash", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(VERIFIED_USER);
    (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "wrong-password" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("returns 500 when the database throws an unexpected connection error", async () => {
    (db.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("ECONNRESET: Connection reset by peer"),
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "password" });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/auth/register", () => {
  it("returns 201 and sends a verification email for a new, unique address", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);
    (db.user.create as jest.Mock).mockResolvedValue({
      id: "new-id",
      email: "bob@test.com",
    });
    (db.authToken.create as jest.Mock).mockResolvedValue({});

    const res = await request(app).post("/api/auth/register").send({
      email: "bob@test.com",
      name: "Bob",
      password: "password123",
      githubUsername: "bobdev",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/verification/i);
  });

  it("returns 400 when the email address is already registered", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "existing",
      email: "bob@test.com",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "bob@test.com",
      name: "Bob",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already in use/i);
  });

  it("returns 500 when the database crashes during the user creation step", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);
    (db.user.create as jest.Mock).mockRejectedValue(
      new Error("Deadlock detected in transaction"),
    );

    const res = await request(app).post("/api/auth/register").send({
      email: "crash@test.com",
      name: "Crash User",
      password: "password123",
    });

    expect(res.status).toBe(500);
  });
});
