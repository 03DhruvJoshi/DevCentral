/**
 * Tests for SecurityAnalytics.tsx
 *
 * Branches covered:
 *   Loading state    — spinner shown while fetches are in-flight
 *   Happy path       — heading and repo name rendered after data loads
 *   Tab navigation   — Overview, Deep Dive, Issue Register tabs present
 *   404 error        — "Repository not analyzed by SonarQube yet" message
 *   Generic error    — "Failed to fetch SonarQube data" message
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SecurityAnalytics from "./SecurityAnalytics.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

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

const METRICS = {
  alert_status: "OK",
  bugs: "2",
  vulnerabilities: "0",
  security_hotspots: "1",
  coverage: "85.0",
  duplicated_lines_density: "3.2",
  ncloc: "4500",
  blocker_violations: "0",
  critical_violations: "1",
  major_violations: "3",
  minor_violations: "5",
  sqale_rating: "A",
  reliability_rating: "A",
  security_rating: "A",
};

const ISSUES = {
  issues: [],
  topFiles: [],
  topRules: [],
  bySeverity: {},
  byType: {},
};

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <SecurityAnalytics selectedRepo={SELECTED_REPO} />
    </MemoryRouter>,
  );
}

describe("SecurityAnalytics", () => {
  it("shows a loading spinner while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders the SAST heading and repo name after data loads", async () => {
    mockFetch.mockResolvedValue(ok(METRICS));
    // second call (issues) also resolves
    mockFetch.mockResolvedValueOnce(ok(METRICS)).mockResolvedValueOnce(ok(ISSUES));
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/static application security testing/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });

  it("renders Overview, Deep Dive, and Issue Register tabs after load", async () => {
    mockFetch.mockResolvedValueOnce(ok(METRICS)).mockResolvedValueOnce(ok(ISSUES));
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /deep dive/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /issue register/i }),
    ).toBeInTheDocument();
  });

  it("shows 404 error message when repo is not analyzed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    }).mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/repository not analyzed by sonarqube yet/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows generic error message on non-404 failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    }).mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/failed to fetch sonarqube data/i),
      ).toBeInTheDocument(),
    );
  });
});
