/**
 * Tests for ConnectGitHubPage.tsx
 *
 * Branches covered:
 *   Render       — "Connect GitHub" heading, authorize button and step indicators
 *   Fetch error  — error banner when begin-connect fetch fails
 *   OAuth success — "GitHub Connected!" state after the popup posts the success message
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConnectGitHubPage } from "./ConnectGitHubPage.js";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("location", { href: "" });
  localStorage.clear();
});

describe("ConnectGitHubPage", () => {
  it("renders the Connect GitHub heading and authorize button", () => {
    render(<ConnectGitHubPage />);

    expect(screen.getByText("Connect GitHub")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /authorize with github/i }),
    ).toBeInTheDocument();
    // Onboarding step indicators
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows an error banner when the begin-connect fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "GitHub OAuth not configured" }),
    });

    const user = userEvent.setup();
    render(<ConnectGitHubPage />);

    await user.click(
      screen.getByRole("button", { name: /authorize with github/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/github oauth not configured/i),
      ).toBeInTheDocument();
    });
  });

  it("shows the 'GitHub Connected!' success state after the OAuth popup posts its message", async () => {
    // First fetch: begin-connect → returns the OAuth popup URL
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authUrl: "https://github.com/login/oauth/authorize?client_id=x",
        }),
      })
      // Second fetch: refresh → returns updated JWT with githubUsername
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "refreshed-jwt",
          user: { githubUsername: "octocat" },
        }),
      });

    const fakePopup = { closed: false, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => fakePopup));

    const user = userEvent.setup();
    render(<ConnectGitHubPage />);

    await user.click(
      screen.getByRole("button", { name: /authorize with github/i }),
    );

    // Wait for window.open to be called (fetch has resolved)
    await waitFor(() => expect(window.open).toHaveBeenCalled());

    // Simulate the OAuth success postMessage from the popup
    window.dispatchEvent(
      new MessageEvent("message", { data: "github-oauth-success" }),
    );

    await waitFor(() => {
      expect(screen.getByText(/github connected/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/@octocat/)).toBeInTheDocument();
  });
});
