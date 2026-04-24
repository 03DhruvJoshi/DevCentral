/**
 * Tests for email.ts — Transactional email helpers
 * Functions covered:
 *   sendVerificationOtpEmail  — sends a 6-digit OTP for email verification
 *   sendPasswordResetEmail    — sends a reset-password link
 *
 * Note: email.ts exports helper functions only (no HTTP router).
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ── Shared mock instance ──────────────────────────────────────────────────────

const mockSendTransacEmail = jest.fn();

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("@getbrevo/brevo", () => ({
  BrevoClient: jest.fn(() => ({
    transactionalEmails: {
      sendTransacEmail: mockSendTransacEmail,
    },
  })),
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { sendVerificationOtpEmail, sendPasswordResetEmail } = await import(
  "./email"
);

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
});

// ── Test suites ───────────────────────────────────────────────────────────────

describe("sendVerificationOtpEmail", () => {
  it("calls Brevo with the OTP in the email body when API credentials are configured", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "noreply@devcentral.test";
    (mockSendTransacEmail as jest.Mock).mockResolvedValue({});

    await sendVerificationOtpEmail("alice@test.com", "123456");

    expect(mockSendTransacEmail).toHaveBeenCalledTimes(1);
    const call = (mockSendTransacEmail as jest.Mock).mock.calls[0][0] as any;
    expect(call.to).toEqual([{ email: "alice@test.com" }]);
    expect(call.htmlContent).toContain("123456");
  });

  it("silently skips Brevo when BREVO_API_KEY is absent (no crash, no send)", async () => {
    // createBrevoClient() returns null → email is skipped gracefully
    await expect(
      sendVerificationOtpEmail("alice@test.com", "999999"),
    ).resolves.toBeUndefined();

    expect(mockSendTransacEmail).not.toHaveBeenCalled();
  });

  it("propagates the rejection when Brevo returns a 401 unauthorized error", async () => {
    process.env.BREVO_API_KEY = "bad-key";
    process.env.EMAIL_FROM = "noreply@devcentral.test";
    (mockSendTransacEmail as jest.Mock).mockRejectedValue(
      new Error("401 Unauthorized"),
    );

    await expect(
      sendVerificationOtpEmail("alice@test.com", "111111"),
    ).rejects.toThrow("401 Unauthorized");
  });
});

describe("sendPasswordResetEmail", () => {
  it("calls Brevo with the reset URL embedded in the email body", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "noreply@devcentral.test";
    (mockSendTransacEmail as jest.Mock).mockResolvedValue({});
    const resetUrl = "https://app.devcentral.test/reset-password?token=abc123";

    await sendPasswordResetEmail("bob@test.com", resetUrl);

    expect(mockSendTransacEmail).toHaveBeenCalledTimes(1);
    const call = (mockSendTransacEmail as jest.Mock).mock.calls[0][0] as any;
    expect(call.to).toEqual([{ email: "bob@test.com" }]);
    expect(call.htmlContent).toContain(resetUrl);
  });

  it("silently skips sending when EMAIL_FROM is not configured", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    // EMAIL_FROM intentionally absent

    await expect(
      sendPasswordResetEmail("bob@test.com", "https://example.com/reset"),
    ).resolves.toBeUndefined();

    expect(mockSendTransacEmail).not.toHaveBeenCalled();
  });

  it("propagates a network error when the Brevo transport is unreachable", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.EMAIL_FROM = "noreply@devcentral.test";
    (mockSendTransacEmail as jest.Mock).mockRejectedValue(
      new Error("ECONNREFUSED: Brevo SMTP server unreachable"),
    );

    await expect(
      sendPasswordResetEmail("bob@test.com", "https://example.com/reset"),
    ).rejects.toThrow("ECONNREFUSED");
  });
});
