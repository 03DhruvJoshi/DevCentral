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

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 with a generic message even when the user does not exist", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account/i);
  });

  it("returns 200 and issues a reset token when the user exists", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@test.com",
    });
    (db.authToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (db.authToken.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "alice@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account/i);
  });

  it("returns 400 when email is missing from the request body", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when token or password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "tok" }); // no password

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when password is too short (< 6 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "tok", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it("returns 400 when the reset token is invalid or expired", async () => {
    (db.authToken.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "bad-token", password: "newpassword123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("returns 200 when the reset token is valid and password is updated", async () => {
    (db.authToken.findFirst as jest.Mock).mockResolvedValue({
      id: "tok1",
      userId: "u1",
    });
    (db.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "valid-token", password: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────

describe("POST /api/auth/verify-email", () => {
  it("returns 400 when email or otp is missing", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "alice@test.com" }); // no otp

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when the user does not exist", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "nobody@test.com", otp: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid verification code/i);
  });

  it("returns 200 with already-verified message when email is already verified", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@test.com",
      emailVerified: true,
    });

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "alice@test.com", otp: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already verified/i);
  });

  it("returns 400 when the OTP is invalid or expired", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@test.com",
      emailVerified: false,
    });
    (db.authToken.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "alice@test.com", otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("returns 200 and a JWT when OTP verification succeeds", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@test.com",
      name: "Alice",
      emailVerified: false,
      githubUsername: null,
      role: "DEV",
    });
    (db.authToken.findFirst as jest.Mock).mockResolvedValue({ id: "tok1" });
    (db.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "alice@test.com", otp: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.message).toMatch(/verified/i);
  });
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────

describe("POST /api/auth/resend-verification", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it("returns 200 with generic message even if user does not exist", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "nobody@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that account/i);
  });

  it("returns 200 and resends OTP when user is unverified", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@test.com",
      emailVerified: false,
    });
    (db.authToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (db.authToken.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "alice@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that account/i);
  });
});

// ── POST /api/auth/login — additional edge cases ──────────────────────────────

describe("POST /api/auth/login — additional edge cases", () => {
  it("returns 403 when user email is not verified", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      ...VERIFIED_USER,
      emailVerified: false,
      role: "DEV",
    });
    (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "correct-password" });

    expect(res.status).toBe(403);
    expect(res.body.emailNotVerified).toBe(true);
  });

  it("returns 403 when user account is suspended", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      ...VERIFIED_USER,
      emailVerified: true,
      status: "SUSPENDED",
    });
    (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "correct-password" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/suspended/i);
  });

  it("returns 200 when admin user logs in (bypasses email verification)", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      ...VERIFIED_USER,
      emailVerified: false,
      role: "ADMIN",
    });
    (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@test.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
  });

  it("returns 400 when user is not found", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@test.com", password: "any" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  it("returns 200 with a new token for an authenticated user", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      name: "Test User",
      githubUsername: null,
      role: "DEV",
      createdAt: new Date(),
      dashboardPreferences: null,
    });

    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
  });

  it("returns 404 when the user record is missing from the database", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────

describe("PATCH /api/auth/profile", () => {
  it("returns 400 when name is empty", async () => {
    const res = await request(app)
      .patch("/api/auth/profile")
      .send({ name: "  ", address: "123 Main St" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  it("returns 404 when the user does not exist in the database", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/auth/profile")
      .send({ name: "Alice", address: "123 Main St" });

    expect(res.status).toBe(404);
  });

  it("returns 200 with updated user data on success", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      name: "Old Name",
      role: "DEV",
      githubUsername: null,
      dashboardPreferences: null,
    });
    (db.user.update as jest.Mock).mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      name: "Alice",
      role: "DEV",
      githubUsername: null,
      createdAt: new Date(),
      dashboardPreferences: null,
    });

    const res = await request(app)
      .patch("/api/auth/profile")
      .send({ name: "Alice", address: "456 Oak Ave" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Alice");
  });
});

// ── GET /api/auth/github/status ───────────────────────────────────────────────

describe("GET /api/auth/github/status", () => {
  it("returns 200 with connected:false when user has no GitHub token", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: null,
      githubUsername: null,
    });

    const res = await request(app).get("/api/auth/github/status");

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });

  it("returns 200 with connected:true when user has a GitHub token", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: "gho_valid_token",
      githubUsername: "testuser",
    });

    const res = await request(app).get("/api/auth/github/status");

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.githubUsername).toBe("testuser");
  });
});

// ── DELETE /api/auth/github/disconnect ────────────────────────────────────────

describe("DELETE /api/auth/github/disconnect", () => {
  it("returns 200 with disconnect confirmation message", async () => {
    (db.user.update as jest.Mock).mockResolvedValue({});

    const res = await request(app).delete("/api/auth/github/disconnect");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/disconnected/i);
  });
});

// ── POST /api/auth/github/begin-connect ──────────────────────────────────────

describe("POST /api/auth/github/begin-connect", () => {
  it("returns 200 with a GitHub auth URL", async () => {
    const res = await request(app).post("/api/auth/github/begin-connect");

    expect(res.status).toBe(200);
    expect(res.body.authUrl).toMatch(/github\.com\/login\/oauth\/authorize/i);
  });
});

