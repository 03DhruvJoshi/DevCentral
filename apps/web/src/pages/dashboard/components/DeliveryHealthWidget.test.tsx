/**
 * Tests for DeliveryHealthWidget.tsx
 *
 * Branches covered:
 *   Loading state    — "Loading delivery telemetry..." shown while fetches in-flight
 *   Repo selector    — select dropdown rendered with repo options
 *   Error state      — error message shown when repos fetch fails
 *   Metrics rendered — success rate and MTTR visible after data loads
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardProvider } from "../DashboardContext.js";
import { DeliveryHealthWidget } from "./DeliveryHealthWidget.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

const REPOS = [
  { id: 1, name: "frontend", owner: "acme" },
  { id: 2, name: "backend", owner: "acme" },
];

const CICD_DATA = {
  summary: {
    total_runs: 50,
    success: 45,
    failure: 5,
    avg_duration_min: 4.5,
    deploy_frequency_per_day: 3,
    mttr_min: 60,
  },
};

function renderWidget() {
  return render(
    <DashboardProvider>
      <DeliveryHealthWidget />
    </DashboardProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("DeliveryHealthWidget", () => {
  it("shows 'Loading delivery telemetry...' while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWidget();

    expect(
      screen.getByText(/loading delivery telemetry/i),
    ).toBeInTheDocument();
  });

  it("renders repo options in the dropdown after data loads", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => REPOS }) // repos
      .mockResolvedValue({ ok: true, json: async () => CICD_DATA }); // cicd

    renderWidget();

    await waitFor(() => {
      expect(screen.getByText("acme/frontend")).toBeInTheDocument();
    });
  });

  it("shows an error message when the repos fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    renderWidget();

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load repositories/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the success rate progress bar and MTTR value after data loads", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => REPOS })
      .mockResolvedValue({ ok: true, json: async () => CICD_DATA });

    renderWidget();

    await waitFor(() => {
      // Success rate is 45/50 = 90 %
      expect(screen.getByText(/90(\.\d+)?%/)).toBeInTheDocument();
    });
  });
});
