import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express, { IRouter } from "express";
import crypto from "node:crypto";

import cors from "cors";

import {
  AuthTokenType,
  PrismaClient,
} from "../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { sendPasswordResetEmail, sendVerificationOtpEmail } from "./email.js";
import { authenticateToken } from "./authenticatetoken.js";
import type { AuthenticatedRequest } from "./api_types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;

const githubClientId = `${process.env.GITHUB_CLIENT_ID}`;
const githubClientSecret = `${process.env.GITHUB_CLIENT_SECRET}`;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const router: IRouter = express.Router();

const RESET_EXPIRY_MINUTES = 30;

type RateLimitBucket = {
  count: number;
  windowStartAt: number;
  blockedUntil: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

function consumeRateLimit(params: {
  key: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(params.key);

  if (!existing) {
    rateLimitStore.set(params.key, {
      count: 1,
      windowStartAt: now,
      blockedUntil: 0,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000),
    };
  }

  if (now - existing.windowStartAt > params.windowMs) {
    existing.count = 0;
    existing.windowStartAt = now;
    existing.blockedUntil = 0;
  }

  existing.count += 1;

  if (existing.count > params.maxAttempts) {
    existing.blockedUntil = now + params.blockMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(params.blockMs / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function enforceRateLimit(params: {
  req: express.Request;
  res: express.Response;
  prefix: string;
  principal?: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
  message: string;
}): boolean {
  const ip = getClientIp(params.req);
  const principalPart = params.principal ? `:${params.principal}` : "";
  const key = `${params.prefix}:${ip}${principalPart}`;
  const limited = consumeRateLimit({
    key,
    maxAttempts: params.maxAttempts,
    windowMs: params.windowMs,
    blockMs: params.blockMs,
  });

  if (!limited.allowed) {
    params.res.setHeader("Retry-After", String(limited.retryAfterSeconds));
    params.res.status(429).json({
      error: params.message,
      retryAfterSeconds: limited.retryAfterSeconds,
    });
    return false;
  }

  return true;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function createOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function issueAuthToken(params: {
  userId: string;
  type: AuthTokenType;
  rawToken: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.authToken.create({
    data: {
      userId: params.userId,
      type: params.type,
      tokenHash: hashToken(params.rawToken),
      expiresAt: params.expiresAt,
    },
  });
}

async function invalidateOutstandingTokens(
  userId: string,
  type: AuthTokenType,
): Promise<void> {
  await prisma.authToken.updateMany({
    where: {
      userId,
      type,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });
}

function signUserToken(user: {
  id: string;
  email: string;
  githubUsername: string | null;
  role: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      githubUsername: user.githubUsername,
      role: user.role,
    },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "24h" },
  );
}

function envValue(key: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[key];
}

router.use(cors());
router.use(express.json());

router.post("/api/auth/register", async (req, res) => {
  try {
    const { email, name, password, githubUsername } = req.body;
    const normalizedEmail = normalizeEmail(String(email ?? ""));

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        githubUsername,
        emailVerified: false,
      },
    });

    const otp = createOtp();
    await issueAuthToken({
      userId: user.id,
      type: AuthTokenType.EMAIL_VERIFY,
      rawToken: otp,
      expiresAt: expiryFromNow(10),
    });
    await sendVerificationOtpEmail(normalizedEmail, otp);

    res.status(201).json({
      message:
        "Account created. Please check your email for a verification code.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword)
      return res.status(400).json({ error: "Invalid credentials" });

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before signing in.",
        emailNotVerified: true,
        email: user.email,
      });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        error: "Account is suspended. Contact an administrator.",
      });
    }

    // Generate JWT Token
    const token = signUserToken(user);

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const allowed = enforceRateLimit({
      req,
      res,
      prefix: "forgot-password",
      principal: normalizedEmail,
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
      message: "Too many reset requests. Please try again later.",
    });
    if (!allowed) {
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (user) {
      await invalidateOutstandingTokens(user.id, AuthTokenType.PASSWORD_RESET);

      const rawToken = createResetToken();
      await issueAuthToken({
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
        rawToken,
        expiresAt: expiryFromNow(RESET_EXPIRY_MINUTES),
      });

      const webBaseUrl = envValue("APP_BASE_URL") || "http://localhost:5173";
      const resetUrl = `${webBaseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({
      message:
        "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to process forgot password request" });
  }
});

router.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: "Token and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const tokenHash = hashToken(token);
    const resetToken = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.authToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

const oauthStateStore = new Map<
  string,
  { userId: string; expiresAt: number }
>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.expiresAt < now) oauthStateStore.delete(key);
  }
}, 60_000);

router.post(
  "/api/auth/github/begin-connect",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const clientId = githubClientId;
    if (!clientId) {
      return res
        .status(500)
        .json({ error: "GitHub OAuth is not configured on this server." });
    }

    const state = crypto.randomBytes(16).toString("hex");
    oauthStateStore.set(state, {
      userId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const apiBaseUrl = envValue("API_BASE_URL") ?? "http://localhost:4000";
    const callbackUrl = `${apiBaseUrl}/api/auth/github/callback`;
    const authUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&scope=repo` +
      `&state=${state}`;

    res.json({ authUrl });
  },
);

router.get("/api/auth/github/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    return res.status(400).send("Missing code or state.");
  }

  const stateData = oauthStateStore.get(state);
  if (!stateData || stateData.expiresAt < Date.now()) {
    oauthStateStore.delete(state);
    return res
      .status(400)
      .send("Invalid or expired OAuth state. Please try again.");
  }
  oauthStateStore.delete(state);

  const clientId = githubClientId;
  const clientSecret = githubClientSecret;
  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .send("GitHub OAuth is not configured on this server.");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    console.error("GitHub token exchange failed:", tokenData);
    return res.status(400).send("Failed to obtain GitHub access token.");
  }

  const githubUserRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "DevCentral",
    },
  });
  const githubUser = (await githubUserRes.json()) as { login?: string };

  await prisma.user.update({
    where: { id: stateData.userId },
    data: {
      githubAccessToken: accessToken,
      ...(githubUser.login ? { githubUsername: githubUser.login } : {}),
    },
  });

  res.send(`<!DOCTYPE html>
<html>
<head><title>GitHub Connected – DevCentral</title></head>
<body style="font-family:sans-serif;text-align:center;padding-top:80px;background:#f9fafb">
  <h2 style="color:#16a34a">GitHub Connected!</h2>
  <p style="color:#6b7280">You can close this window.</p>
  <script>
    if (window.opener) window.opener.postMessage('github-oauth-success', '*');
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`);
});

router.get(
  "/api/auth/github/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true, githubUsername: true },
    });

    res.json({
      connected: !!user?.githubAccessToken,
      githubUsername: user?.githubUsername ?? null,
    });
  },
);

router.delete(
  "/api/auth/github/disconnect",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await prisma.user.update({
      where: { id: userId },
      data: { githubAccessToken: null },
    });

    res.json({ message: "GitHub account disconnected." });
  },
);

// ─────────────────────────────────────────────────────────────────────────────

// Issues a fresh JWT reflecting the current DB state (e.g. after GitHub connect)
router.post(
  "/api/auth/refresh",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, githubUsername: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = signUserToken(user);
    res.json({
      token,
      user: { name: user.name, email: user.email, githubUsername: user.githubUsername, role: user.role },
    });
  },
);

router.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    if (user.emailVerified) {
      return res.json({ message: "Email already verified. You can sign in." });
    }

    const tokenHash = hashToken(otp.trim());
    const authToken = await prisma.authToken.findFirst({
      where: {
        userId: user.id,
        type: AuthTokenType.EMAIL_VERIFY,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!authToken) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code." });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Auto-issue a JWT so the frontend can immediately call /begin-connect
    const jwtToken = signUserToken(user);

    res.json({
      message: "Email verified successfully.",
      token: jwtToken,
      user: {
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Verification failed." });
  }
});

router.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const allowed = enforceRateLimit({
      req,
      res,
      prefix: "resend-verification",
      principal: normalizedEmail,
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
      message: "Too many resend requests. Please try again later.",
    });
    if (!allowed) return;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && !user.emailVerified) {
      await invalidateOutstandingTokens(user.id, AuthTokenType.EMAIL_VERIFY);

      const otp = createOtp();
      await issueAuthToken({
        userId: user.id,
        type: AuthTokenType.EMAIL_VERIFY,
        rawToken: otp,
        expiresAt: expiryFromNow(10),
      });
      await sendVerificationOtpEmail(normalizedEmail, otp);
    }

    res.json({
      message:
        "If that account exists and is unverified, a new code has been sent.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to resend verification code." });
  }
});

export default router;
