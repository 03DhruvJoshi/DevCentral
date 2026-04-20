/**
 * Tests for AdminRoute.tsx
 *
 * Branches covered:
 *   Not logged in  — Navigate redirects to /login
 *   Non-admin user — Navigate redirects to /dashboard
 *   Admin user     — AdminPortalPage is rendered
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminRoute } from "./AdminRoute.js";
import { isUserLoggedIn } from "../../lib/auth.js";

// ── Module mocks (hoisted by Vitest) ──────────────────────────────────────────

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to} />
    ),
  };
});

vi.mock("./AdminPortalPage.js", () => ({
  AdminPortalPage: () => (
    <div data-testid="admin-portal-page">AdminPortalPage</div>
  ),
}));

vi.mock("../../lib/auth.js", () => ({
  isUserLoggedIn: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

describe("AdminRoute", () => {
  it("redirects to /login when the user is not logged in", () => {
    vi.mocked(isUserLoggedIn).mockReturnValue(false);
    render(<AdminRoute />);

    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/login");
    expect(screen.queryByTestId("admin-portal-page")).not.toBeInTheDocument();
  });

  it("redirects to /dashboard when the user is logged in but has a non-ADMIN role", () => {
    vi.mocked(isUserLoggedIn).mockReturnValue(true);
    localStorage.setItem(
      "devcentral_user",
      JSON.stringify({ id: "u1", role: "DEV" }),
    );

    render(<AdminRoute />);

    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/dashboard");
  });

  it("renders AdminPortalPage when the user is logged in as ADMIN", () => {
    vi.mocked(isUserLoggedIn).mockReturnValue(true);
    localStorage.setItem(
      "devcentral_user",
      JSON.stringify({ id: "a1", role: "ADMIN" }),
    );

    render(<AdminRoute />);

    expect(screen.getByTestId("admin-portal-page")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});
