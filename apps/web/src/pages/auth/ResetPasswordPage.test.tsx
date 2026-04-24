/**
 * Tests for ResetPasswordPage.tsx
 *
 * Branches covered:
 *   Render            — two password fields and submit button
 *   Missing token     — inline error without a fetch call
 *   Password too short — inline error for < 6 chars
 *   Passwords mismatch — inline error when fields differ
 *   Happy path        — success banner on a valid API response
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage.js";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("location", { search: "?token=reset-token-abc", href: "" });
});

describe("ResetPasswordPage", () => {
  it("renders 'New Password' and 'Confirm New Password' fields", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText(/set a new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i }),
    ).toBeInTheDocument();
  });

  it("shows an error without fetching when there is no reset token in the URL", async () => {
    vi.stubGlobal("location", { search: "", href: "" });
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/^new password$/i), "secure123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "secure123",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/missing or invalid reset token/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows an error without fetching when the password is fewer than 6 characters", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/^new password$/i), "abc");
    await user.type(screen.getByLabelText(/confirm new password/i), "abc");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      screen.getByText(/at least 6 characters/i),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows an error without fetching when the two passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/^new password$/i), "password1");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "password2",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows a success banner when the API accepts the new password", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Password reset successful. You can now log in.",
      }),
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/^new password$/i), "newpassword");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newpassword",
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password reset successful/i),
      ).toBeInTheDocument();
    });
  });
});
