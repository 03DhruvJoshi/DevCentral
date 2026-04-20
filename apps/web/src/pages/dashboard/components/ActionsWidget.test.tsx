/**
 * Tests for ActionsWidget.tsx
 *
 * Branches covered:
 *   Loading state    — spinner shown while fetches are in-flight
 *   Error state      — error message displayed when repos fetch fails
 *   Action Center    — heading and repo badge rendered after load
 *   CI status        — latest run conclusion badge visible
 *   Open PR count    — open PR count rendered from API data
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionsWidget } from "./ActionsWidget.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

const REPOS = [{ id: 1, name: "webapp", owner: "acme", url: "https://github.com/acme/webapp" }];

const ACTIONS_DATA = {
  workflow_runs: [
    {
      id: 101,
      conclusion: "success",
      status: "completed",
      html_url: "https://github.com/acme/webapp/actions/runs/101",
      name: "CI",
    },
  ],
};

const PRS_DATA = [
  { id: 1, state: "open", html_url: "https://github.com/acme/webapp/pull/1" },
  { id: 2, state: "open", html_url: "https://github.com/acme/webapp/pull/2" },
  { id: 3, state: "closed", html_url: "https://github.com/acme/webapp/pull/3" },
];

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("ActionsWidget", () => {
  it("shows a loading spinner while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ActionsWidget />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows an error message when the repos fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<ActionsWidget />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load repositories/i),
      ).toBeInTheDocument();
    });
  });

  it("renders 'Action Center' heading and repo count badge after load", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => REPOS })
      .mockResolvedValueOnce({ ok: true, json: async () => ACTIONS_DATA })
      .mockResolvedValueOnce({ ok: true, json: async () => PRS_DATA });

    render(<ActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText(/action center/i)).toBeInTheDocument();
      expect(screen.getByText(/1 repos/i)).toBeInTheDocument();
    });
  });

  it("renders the CI conclusion badge from the latest run", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => REPOS })
      .mockResolvedValueOnce({ ok: true, json: async () => ACTIONS_DATA })
      .mockResolvedValueOnce({ ok: true, json: async () => PRS_DATA });

    render(<ActionsWidget />);

    await waitFor(() => {
      expect(screen.getByText(/ci status/i)).toBeInTheDocument();
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it("renders the correct open PR count from the API response", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => REPOS })
      .mockResolvedValueOnce({ ok: true, json: async () => ACTIONS_DATA })
      .mockResolvedValueOnce({ ok: true, json: async () => PRS_DATA });

    render(<ActionsWidget />);

    await waitFor(() => {
      // 2 open PRs in PRS_DATA
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
