import { BrevoClient } from "@getbrevo/brevo";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function createBrevoClient(): BrevoClient | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new BrevoClient({ apiKey });
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const client = createBrevoClient();

  if (!client) {
    console.warn(
      `[mail-disabled] BREVO_API_KEY not set. Intended email to ${to}: ${subject}`,
    );
    return;
  }

  const senderEmail = process.env.EMAIL_FROM;
  if (!senderEmail) {
    console.warn(
      "[mail-disabled] EMAIL_FROM not set. Add your verified Brevo sender email to .env",
    );
    return;
  }

  await client.transactionalEmails.sendTransacEmail({
    sender: { email: senderEmail, name: "DevCentral" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
}

export async function sendVerificationOtpEmail(
  email: string,
  otp: string,
): Promise<void> {
  await sendEmail(
    email,
    "DevCentral verification code",
    `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your DevCentral account</h2>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  await sendEmail(
    email,
    "DevCentral password reset",
    `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset your DevCentral password</h2>
        <p>Use the link below to set a new password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  );
}
