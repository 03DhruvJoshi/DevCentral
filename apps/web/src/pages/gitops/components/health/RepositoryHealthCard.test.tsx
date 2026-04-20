/**
 * Tests for RepositoryHealthCard.tsx
 *
 * Branches covered:
 *   Loading state      — spinner shown while fetch is in-flight
 *   Happy path         — score and health status label rendered after fetch
 *   Unable to load     — "Unable to load health data" shown when fetch fails
 *   Retry button       — Retry fires a new fetch
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RepositoryHealthCard from "./RepositoryHealthCard.js";

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

const HEALTH_DATA = {
  healthStatus: "green",
  overallScore: 82,
  securityScore: 20,
  codeQualityScore: 22,
  deploymentReadinessScore: 20,
  teamOwnershipScore: 20,
  securityIssues: [],
  codeQualityIssues: [],
  deploymentReadinessIssues: [],
  teamOwnershipIssues: [],
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("RepositoryHealthCard", () => {
  it("shows a loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<RepositoryHealthCard selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders 'Repository Health' heading and score after fetch resolves", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => HEALTH_DATA });
    render(<RepositoryHealthCard selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/repository health/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("shows 'Unable to load health data' when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<RepositoryHealthCard selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText(/unable to load health data/i),
      ).toBeInTheDocument(),
    );
  });

  it("fires a new fetch when the Retry button is clicked", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<RepositoryHealthCard selectedRepo={SELECTED_REPO} />);

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
