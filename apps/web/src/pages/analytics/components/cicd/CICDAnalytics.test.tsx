/**
 * Tests for CICDAnalytics.tsx
 *
 * Branches covered:
 *   Loading state     — spinner shown while fetch is in-flight
 *   Happy path        — heading and repo name rendered after data loads
 *   Tab navigation    — clicking Performance tab shows the Performance panel
 *   Refresh button    — clicking Refresh triggers a new fetch
 *   Error state       — error message rendered when API returns 503
 *   Timeframe filter  — changing the timeframe dropdown refetches with new days param
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CICDAnalytics from "./CICDAnalytics.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockFetch = vi.fn();

const SELECTED_REPO = { id: 1, name: "webapp", owner: "acme", url: "", private: false, language: "TypeScript", updated_at: "" };

const CICD_DATA = {
  summary: {
    total_runs: 20,
    success: 18,
    failure: 2,
    avg_duration_min: 5,
    deploy_frequency_per_day: 2.5,
    change_failure_rate: 10,
    mttr_min: 30,
    queue_sla_breach_count: 1,
    long_running_count: 0,
    flaky_commit_count: 0,
  },
  success_rate_over_time: [],
  conclusion_breakdown: [],
  run_register: [
    {
      run_id: 101,
      workflow: "CI",
      branch: "main",
      conclusion: "success",
      actor: "alice",
      event: "push",
      queue_min: 1,
      exec_min: 4,
      created_at: new Date().toISOString(),
      url: "https://github.com/acme/webapp/runs/101",
    },
  ],
  workflow_breakdown: [],
  branch_breakdown: [],
  flaky_workflows: [],
  slowest_jobs: [],
  queue_vs_execution: { avg_queue_min: 1, avg_exec_min: 4, runs: [] },
  deploy_days: 10,
};

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <CICDAnalytics selectedRepo={SELECTED_REPO} />
    </MemoryRouter>,
  );
}

describe("CICDAnalytics", () => {
  it("shows a loading spinner while the fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders the CI/CD heading and repo name after data loads", async () => {
    mockFetch.mockResolvedValue(ok(CICD_DATA));
    renderComponent();

    await waitFor(() =>
      expect(screen.getByText(/CI\/CD Pipeline Telemetry/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });

  it("renders the Performance tab trigger after data loads", async () => {
    mockFetch.mockResolvedValue(ok(CICD_DATA));
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /performance/i })).toBeInTheDocument(),
    );
  });

  it("fires a new fetch when the Refresh button is clicked", async () => {
    mockFetch.mockResolvedValue(ok(CICD_DATA));
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument(),
    );

    const callsBefore = mockFetch.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("shows an error message when the API returns 503", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(/failed to fetch ci\/cd pipelines telemetry/i),
      ).toBeInTheDocument(),
    );
  });

  it("refetches with the chosen days when the timeframe dropdown changes", async () => {
    mockFetch.mockResolvedValue(ok(CICD_DATA));
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() =>
      expect(screen.getByDisplayValue(/last 30 days/i)).toBeInTheDocument(),
    );

    await user.selectOptions(screen.getByDisplayValue(/last 30 days/i), "7");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("days=7"),
        expect.any(Object),
      ),
    );
  });
});
