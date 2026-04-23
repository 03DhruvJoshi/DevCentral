/**
 * Tests for PlatformSummaryWidget.tsx
 *
 * Branches covered:
 *   Loading state    — spinner shown while fetch is in-flight
 *   Happy path       — stat cards render after successful API response
 *   Open issues      — "Needs attention" trend appears when openIssues > 10
 *   Error state      — error message rendered when repos fetch fails (503)
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlatformSummaryWidget } from "./PlatformSummaryWidget.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

vi.mock("../DashboardContext.js", () => ({
  useDashboardContext: () => ({ dateRange: "7d" }),
}));

const mockFetch = vi.fn();

const REPOS = [{ id: 1, name: "webapp", owner: "acme", url: "https://github.com/acme/webapp" }];
const ISSUES = [
  { id: 1, state: "open", pull_request: undefined },
  { id: 2, state: "open", pull_request: undefined },
];
const PRS = [{ id: 1, state: "open" }, { id: 2, state: "closed" }];
const DEPLOYMENTS = [{ id: 1, created_at: new Date().toISOString(), environment: "production" }];

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("PlatformSummaryWidget", () => {
  it("shows a loading spinner while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<PlatformSummaryWidget />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders stat cards after successful API response", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok(ISSUES))
      .mockResolvedValueOnce(ok(PRS))
      .mockResolvedValueOnce(ok(DEPLOYMENTS));

    render(<PlatformSummaryWidget />);

    await waitFor(() =>
      expect(screen.getByText("Platform Overview")).toBeInTheDocument(),
    );
    expect(screen.getByText("Total Repos")).toBeInTheDocument();
    expect(screen.getByText("Open Issues")).toBeInTheDocument();
  });

  it("shows 'Needs attention' trend when open issues exceed 10", async () => {
    const manyIssues = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      state: "open",
      pull_request: undefined,
    }));

    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok(manyIssues))
      .mockResolvedValueOnce(ok(PRS))
      .mockResolvedValueOnce(ok(DEPLOYMENTS));

    render(<PlatformSummaryWidget />);

    await waitFor(() =>
      expect(screen.getByText(/needs attention/i)).toBeInTheDocument(),
    );
  });

  it("renders an error message when the repos fetch returns 503", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    render(<PlatformSummaryWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load repositories/i),
      ).toBeInTheDocument(),
    );
  });
});
