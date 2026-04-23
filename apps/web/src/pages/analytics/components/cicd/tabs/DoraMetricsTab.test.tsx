/**
 * Tests for cicd/tabs/DoraMetricsTab.tsx
 *
 * Branches covered:
 *   Happy path     — key metric labels and values rendered from props
 *   Empty charts   — "No pipeline execution data" shown when success_rate_over_time is empty
 *   Pie chart data — "No outcome distribution data" shown when conclusionChartData is empty
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DoraMetricsTab from "./DoraMetricsTab.js";

const CICD_BASE = {
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
    flaky_commit_count: 2,
  },
  success_rate_over_time: [],
  conclusion_breakdown: [],
  run_register: [],
  workflow_breakdown: [],
  branch_breakdown: [],
  flaky_workflows: [],
  slowest_jobs: [],
  queue_vs_execution: { avg_queue_min: null, avg_exec_min: null, runs: [] },
  deploy_days: 10,
};

describe("DoraMetricsTab", () => {
  it("renders the Pipeline Success, Deploy Frequency, and Flaky Commit labels", () => {
    render(<DoraMetricsTab cicd={CICD_BASE} conclusionChartData={[]} />);

    expect(screen.getByText(/pipeline success/i)).toBeInTheDocument();
    expect(screen.getByText(/deploy frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/flaky commit count/i)).toBeInTheDocument();
  });

  it("shows 'No pipeline execution data' when success_rate_over_time is empty", () => {
    render(<DoraMetricsTab cicd={CICD_BASE} conclusionChartData={[]} />);
    expect(
      screen.getByText(/no pipeline execution data found/i),
    ).toBeInTheDocument();
  });

  it("shows 'No outcome distribution data' when conclusionChartData is empty", () => {
    render(<DoraMetricsTab cicd={CICD_BASE} conclusionChartData={[]} />);
    expect(
      screen.getByText(/no outcome distribution data/i),
    ).toBeInTheDocument();
  });
});
