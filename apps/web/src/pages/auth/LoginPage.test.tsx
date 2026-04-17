/**
 * Tests for LoginPage.tsx
 *
 * Branches covered:
 *   Render      — form fields and branding are visible on mount
 *   Interaction — controlled inputs update as the user types
 *   DEV login   — successful login stores token and redirects to /dashboard
 *   ADMIN login — successful login redirects to /admin
 *   API error   — failed response surfaces the error message in the UI
 *   Unverified  — emailNotVerified flag redirects to /verify-email
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginPage } from "./LoginPage.js";

// ── Shared mock ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  // Replace location with a plain writable object so href assignments are
  // captured without triggering real browser navigation in jsdom.
  vi.stubGlobal("location", { href: "" });
  localStorage.clear();
});

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard Route</div>} />
        <Route path="/admin" element={<div>Admin Route</div>} />
        <Route path="/verify-email" element={<div>Verify Email Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  it("renders the sign-in form with email input, password input, and submit button", () => {
    render(<LoginPage />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("updates the email and password fields as the user types", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");

    expect(screen.getByLabelText(/^email$/i)).toHaveValue("test@example.com");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("secret123");
  });

  it("stores the token in localStorage and redirects a DEV user to /dashboard", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dev-token-abc",
        user: { id: "u1", email: "dev@test.com", role: "DEV" },
      }),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "dev@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe("/dashboard");
    });
    expect(localStorage.getItem("devcentral_token")).toBe("dev-token-abc");
  });

  it("stores the token in localStorage and redirects an ADMIN user to /admin", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "admin-token-xyz",
        user: { id: "a1", email: "admin@test.com", role: "ADMIN" },
      }),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "admin@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "adminpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe("/admin");
    });
    expect(localStorage.getItem("devcentral_token")).toBe("admin-token-xyz");
  });

  it("shows an error banner when the API returns a non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "bad@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    // Button must be re-enabled after the error so the user can retry
    expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
  });

  it("redirects to /verify-email when the server reports the email is not verified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        emailNotVerified: true,
        email: "unverified@test.com",
      }),
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/^email$/i), "unverified@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toContain("/verify-email");
      expect(globalThis.location.href).toContain(
        encodeURIComponent("unverified@test.com"),
      );
    });
  });

  it("integration: runs inside router and updates redirect path and persisted auth state after DEV login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "dev-integration-token",
        user: { id: "u-int", email: "dev@test.com", role: "DEV" },
      }),
    });

    const user = userEvent.setup();
    renderWithRouter();

    await user.type(screen.getByLabelText(/^email$/i), "dev@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toBe("/dashboard");
    });
    expect(localStorage.getItem("devcentral_token")).toBe(
      "dev-integration-token",
    );
    expect(localStorage.getItem("devcentral_user")).toContain('"role":"DEV"');
  });
});
