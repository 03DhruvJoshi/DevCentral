/**
 * Tests for cicd/tabs/PerformanceTab.tsx
 *
 * Branches covered:
 *   Empty state   — "No queue telemetry", "No duration data available", "No workflow breakdown data", "No branch breakdown data"
 *   Happy path    — slowest job name and run ID rendered when data provided
 *   Workflow data — workflow name and run count badge rendered
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PerformanceTab from "./PerformanceTab.js";

const CICD_EMPTY = {
  queue_vs_execution: { avg_queue_min: null, avg_exec_min: null, runs: [] },
  slowest_jobs: [],
  workflow_breakdown: [],
  branch_breakdown: [],
  summary: {
    total_runs: 0,
    success: 0,
    failure: 0,
    avg_duration_min: 0,
    deploy_frequency_per_day: 0,
    change_failure_rate: 0,
    mttr_min: 0,
    queue_sla_breach_count: 0,
    long_running_count: 0,
    flaky_commit_count: 0,
  },
  success_rate_over_time: [],
  conclusion_breakdown: [],
  run_register: [],
  flaky_workflows: [],
  deploy_days: 0,
};

describe("PerformanceTab", () => {
  it("shows empty-state messages when all data arrays are empty", () => {
    render(<PerformanceTab cicd={CICD_EMPTY} />);

    expect(screen.getByText(/no queue telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/no duration data available/i)).toBeInTheDocument();
    expect(screen.getByText(/no workflow breakdown data/i)).toBeInTheDocument();
    expect(screen.getByText(/no branch breakdown data/i)).toBeInTheDocument();
  });

  it("renders a slowest job name and its run ID badge", () => {
    const cicd = {
      ...CICD_EMPTY,
      slowest_jobs: [
        {
          run_id: 42,
          job_name: "Build & Test",
          duration_min: 12.5,
          status: "success",
          url: "https://github.com/acme/webapp/actions/runs/42",
        },
      ],
    };

    render(<PerformanceTab cicd={cicd} />);

    expect(screen.getByText("Build & Test")).toBeInTheDocument();
    expect(screen.getByText(/run #42/i)).toBeInTheDocument();
  });

  it("renders workflow breakdown name and run count badge", () => {
    const cicd = {
      ...CICD_EMPTY,
      workflow_breakdown: [
        {
          workflow: "Deploy Pipeline",
          total_runs: 8,
          success_rate: 87.5,
          failure_rate: 12.5,
          avg_queue_min: 1.2,
          avg_duration_min: 5.4,
        },
      ],
    };

    render(<PerformanceTab cicd={cicd} />);

    expect(screen.getByText("Deploy Pipeline")).toBeInTheDocument();
    expect(screen.getByText(/8 runs/i)).toBeInTheDocument();
  });
});
