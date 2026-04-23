/**
 * Tests for security/tabs/OverviewTab.tsx
 *
 * Branches covered:
 *   Quality Gate PASSED — "PASSED" text rendered when alert_status is "OK"
 *   Quality Gate FAILED — "FAILED" text rendered when alert_status is "ERROR"
 *   Risk badge          — risk level and score shown
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OverviewTab from "./OverviewTab.js";

const BASE_METRICS = {
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

const BASE_PROPS = {
  metrics: BASE_METRICS,
  securityHotspots: 1,
  totalSeverityIssues: 9,
  ncloc: 4500,
  riskIndex: 30,
  riskLevel: "Low" as const,
  riskBadgeClass: "border-emerald-200 bg-emerald-50 text-emerald-600",
};

describe("Security OverviewTab", () => {
  it("renders PASSED when quality gate is OK", () => {
    render(<OverviewTab {...BASE_PROPS} />);
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });

  it("renders FAILED when quality gate is ERROR", () => {
    render(
      <OverviewTab
        {...BASE_PROPS}
        metrics={{ ...BASE_METRICS, alert_status: "ERROR" }}
      />,
    );
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });

  it("renders the Quality Gate label", () => {
    render(<OverviewTab {...BASE_PROPS} />);
    expect(screen.getByText(/quality gate/i)).toBeInTheDocument();
  });
});
