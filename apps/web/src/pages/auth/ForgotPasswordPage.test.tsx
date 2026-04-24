/**
 * Tests for ForgotPasswordPage.tsx
 *
 * Branches covered:
 *   Render      — form with "Email Address" label and submit button
 *   Happy path  — success banner shown with server message
 *   Error state — error banner shown when the API returns a failure
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage.js";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("ForgotPasswordPage", () => {
  it("renders the email input and send button", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows a success banner with the server message after a successful request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Reset link sent — check your inbox.",
      }),
    });

    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email address/i), "dev@test.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
    });
    // Button should re-enable so the user can retry
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).not.toBeDisabled();
  });

  it("shows an error banner when the API returns a non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "No account found with that email" }),
    });

    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "nobody@test.com",
    );
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no account found with that email/i),
      ).toBeInTheDocument();
    });
  });
});
