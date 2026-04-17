/**
 * Tests for VerifyEmailPage.tsx
 *
 * Branches covered:
 *   Render         — heading + email from query-param shown on mount
 *   No-email guard — inline error when location.search has no email
 *   Short OTP      — inline error when OTP length < 6
 *   Happy path     — success banner shown, token stored in localStorage
 *   Redirect       — after 1 s timer fires, navigates to /connect-github
 *   Resend         — clicking "Resend code" calls the resend endpoint
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VerifyEmailPage } from "./VerifyEmailPage.js";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("location", {
    search: "?email=user%40example.com",
    href: "",
  });
  localStorage.clear();
});

describe("VerifyEmailPage", () => {
  it("renders the heading and displays the email address from the URL", () => {
    render(<VerifyEmailPage />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify email/i }),
    ).toBeInTheDocument();
  });

  it("shows an inline error without calling fetch when no email is in the URL", async () => {
    vi.stubGlobal("location", { search: "", href: "" });
    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    expect(
      screen.getByText(/missing email address/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows an inline error without calling fetch when the OTP is fewer than 6 digits", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.type(screen.getByLabelText(/verification code/i), "123");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    expect(screen.getByText(/please enter the 6-digit code/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows the success banner and stores the token on a valid verification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Email verified successfully!",
        token: "jwt-token-123",
        user: { id: "u1", email: "user@example.com" },
      }),
    });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.type(screen.getByLabelText(/verification code/i), "654321");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email verified successfully/i),
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("devcentral_token")).toBe("jwt-token-123");
  });

  it("redirects to /connect-github after the 1-second delay following success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Verified!", token: "tok", user: {} }),
    });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.type(screen.getByLabelText(/verification code/i), "999999");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    // The component sets location.href inside a real 1-second setTimeout.
    // Poll until it fires (max 2 s) rather than fighting fake-timer interactions.
    await waitFor(
      () => {
        expect(globalThis.location.href).toBe("/connect-github");
      },
      { timeout: 2000 },
    );
  });

  it("shows the resend confirmation after clicking 'Resend code'", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "New code sent to your email." }),
    });

    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.click(screen.getByRole("button", { name: /resend code/i }));

    await waitFor(() => {
      expect(screen.getByText(/new code sent/i)).toBeInTheDocument();
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});
