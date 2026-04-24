/**
 * Tests for DeploymentAnalytics.tsx
 *
 * Branches covered:
 *   Loading state  — spinner shown while fetch is in-flight
 *   Happy path     — "Deployment Analytics" heading and repo name rendered
 *   Tab triggers   — Overview, Peak Times, Activity Log tabs present
 *   Error state    — "Failed to load deployment data" shown on error
 *   Retry button   — clicking Retry fires a new fetch
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DeploymentAnalytics from "./DeploymentAnalytics.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
  token: "test-token",
}));

const mockFetch = vi.fn();

const SELECTED_REPO = {
  id: 1,
  name: "webapp",
  owner: "acme",
  url: "",
  private: false,
  language: "TypeScript",
  updated_at: "",
};

const ANALYTICS_DATA = {
  summary: {
    totalDeploys: 12,
    successRate: 91.7,
    avgDurationSec: 60,
    deploysPerDay: 0.4,
    failedDeploys: 1,
    mttrMin: 15,
  },
  recentDeployments: [],
  frequencyOverTime: [],
  providerStats: [],
  statusBreakdown: { success: 11, failed: 1, building: 0, cancelled: 0 },
  peakHours: [],
  weekdayDist: [],
  velocityTrend: { recent: 0.5, older: 0.3, changePct: 66.7 },
  connectedProviders: { vercel: true, render: false },
};

const INTEGRATION_STATUS = {
  vercel: { connected: true },
  render: { connected: false },
};

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("DeploymentAnalytics", () => {
  it("shows a loading spinner while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<DeploymentAnalytics selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders the Deployment Analytics heading and repo name after load", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(INTEGRATION_STATUS))
      .mockResolvedValueOnce(ok(ANALYTICS_DATA));
    render(<DeploymentAnalytics selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/deployment analytics/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });

  it("renders Overview, Peak Times, and Activity Log tab triggers after load", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(INTEGRATION_STATUS))
      .mockResolvedValueOnce(ok(ANALYTICS_DATA));
    render(<DeploymentAnalytics selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /peak times/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /activity log/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Failed to load deployment data' on API error", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(INTEGRATION_STATUS))
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error 503" }),
      });
    render(<DeploymentAnalytics selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load deployment data/i),
      ).toBeInTheDocument(),
    );
  });

  it("fires a new fetch when the Retry button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(INTEGRATION_STATUS))
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "timeout" }),
      });
    const user = userEvent.setup();
    render(<DeploymentAnalytics selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument(),
    );

    const callsBefore = mockFetch.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });
});
