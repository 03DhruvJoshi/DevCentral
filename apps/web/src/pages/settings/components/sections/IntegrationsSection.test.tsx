/**
 * Tests for IntegrationsSection.tsx
 *
 * Branches covered:
 *   Not connected state   — "Not Connected" badge and Connect button rendered
 *   Connected state       — "@username" and Disconnect button rendered
 *   Connect error         — error banner shown when begin-connect returns 500
 *   Revoke interaction    — clicking Disconnect calls DELETE endpoint
 *   Revoke error          — error banner shown when disconnect returns 500
 *   Coming soon           — Azure DevOps and GitLab cards visible
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IntegrationsSection } from "./IntegrationsSection.js";

vi.mock("../../../admin/types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

vi.mock("../../utils.js", () => ({
  getAuthToken: () => "test-token",
  persistUser: vi.fn(),
  refreshSessionUser: vi.fn(async () => null),
}));

const mockFetch = vi.fn();

const NOT_CONNECTED_USER = { githubUsername: null };
const CONNECTED_USER = { githubUsername: "octocat" };

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  // Stub window.open used by handleConnect
  vi.stubGlobal("open", vi.fn(() => ({ closed: false, close: vi.fn() })));
});

describe("IntegrationsSection", () => {
  it("renders 'Not Connected' badge and Connect button when GitHub is not linked", () => {
    render(
      <IntegrationsSection user={NOT_CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    expect(screen.getByText("Not Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^connect/i })).toBeInTheDocument();
  });

  it("renders '@octocat' and Disconnect button when GitHub is connected", () => {
    render(
      <IntegrationsSection user={CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    expect(screen.getByText(/@octocat/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("shows an error when the begin-connect API returns 500", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to start GitHub connect" }),
    });

    const user = userEvent.setup();
    render(
      <IntegrationsSection user={NOT_CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /^connect/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/failed to start github connect/i),
      ).toBeInTheDocument(),
    );
  });

  it("calls the DELETE disconnect endpoint when Disconnect is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(
      <IntegrationsSection user={CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/github/disconnect"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("shows an error when the disconnect API returns 500", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to revoke access." }),
    });

    const user = userEvent.setup();
    render(
      <IntegrationsSection user={CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to revoke access/i)).toBeInTheDocument(),
    );
  });

  it("renders Azure DevOps and GitLab 'Coming Soon' cards", () => {
    render(
      <IntegrationsSection user={NOT_CONNECTED_USER} onUserUpdate={vi.fn()} />,
    );

    expect(screen.getByText("Azure DevOps")).toBeInTheDocument();
    expect(screen.getByText("GitLab")).toBeInTheDocument();
    const comingSoon = screen.getAllByText("Coming Soon");
    expect(comingSoon.length).toBeGreaterThanOrEqual(2);
  });
});
