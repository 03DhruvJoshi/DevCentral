/**
 * Tests for RegisterPage.tsx
 *
 * Branches covered:
 *   Render          — all three form fields and submit button are present
 *   Loading state   — button is disabled and shows spinner text while in-flight
 *   Success         — redirects to /verify-email with the email as a query param
 *   API error       — server error message surfaces in the error banner
 *   Generic fallback — 503 with no error field shows a default message
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RegisterPage } from "./RegisterPage.js";

// ── Shared mock ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("location", { href: "" });
});

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<div>Verify Email Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Helper — fills all three fields ──────────────────────────────────────────

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  await user.type(
    screen.getByLabelText(/full name/i),
    overrides.name ?? "Jane Doe",
  );
  await user.type(
    screen.getByLabelText(/work email/i),
    overrides.email ?? "jane@test.com",
  );
  await user.type(
    screen.getByLabelText(/^password$/i),
    overrides.password ?? "pass123",
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("RegisterPage", () => {
  it("renders the full name, work email, and password fields with a submit button", () => {
    render(<RegisterPage />);

    expect(screen.getByText(/create an account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("disables the button and shows a loading label while the request is in flight", async () => {
    // Keep the fetch pending so we can inspect the in-flight UI state
    let resolveRequest!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillForm(user);

    // Fire and do NOT await so the promise stays pending
    const clickPromise = user.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /creating account/i }),
      ).toBeDisabled();
    });

    // Clean up: resolve the pending request to avoid open handle warnings
    resolveRequest({ ok: true, json: async () => ({}) });
    await clickPromise;
  });

  it("redirects to /verify-email with the correct email query param after successful registration", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillForm(user, { email: "jane@test.com" });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toContain("/verify-email");
      expect(globalThis.location.href).toContain(
        encodeURIComponent("jane@test.com"),
      );
    });
  });

  it("shows the server error message in the error banner when registration fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already registered" }),
    });

    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillForm(user, { email: "taken@test.com" });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
    // The button must recover so the user can retry
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).not.toBeDisabled();
  });

  it("shows a generic fallback error when the server returns a 503 with no error field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // no error field — exercises the || fallback branch
    });

    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/failed to register account/i),
      ).toBeInTheDocument();
    });
  });

  it("integration: executes full form submit flow in router context and redirects with encoded email", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    renderWithRouter();
    await fillForm(user, {
      name: "Integration User",
      email: "integration+user@test.com",
      password: "pass1234",
    });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(globalThis.location.href).toContain("/verify-email");
      expect(globalThis.location.href).toContain(
        encodeURIComponent("integration+user@test.com"),
      );
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/register$/),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
