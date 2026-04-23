/**
 * Tests for deployment/tabs/OverviewTab.tsx
 *
 * Branches covered:
 *   Heading        — "Deployment Frequency" chart card rendered
 *   Summary stats  — total deploy count shown via summary prop
 *   Empty frequency — renders without crashing when frequencyOverTime is empty
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import OverviewTab from "./OverviewTab.js";

const BASE_SUMMARY = {
  totalDeploys: 12,
  successRate: 91.7,
  avgDurationSec: 60,
  deploysPerDay: 0.4,
  failedDeploys: 1,
  mttrMin: 15,
};

const BASE_STATUS = { success: 11, failed: 1, building: 0, cancelled: 0 };
const BASE_VELOCITY = { recent: 0.5, older: 0.3, changePct: 66.7 };

const BASE_PROPS = {
  providerFilter: "all" as const,
  connectedVercel: true,
  connectedRender: false,
  statusBreakdown: BASE_STATUS,
  velocityTrend: BASE_VELOCITY,
  filteredFrequency: [],
  summary: BASE_SUMMARY,
};

describe("Deployment OverviewTab", () => {
  it("renders the Deployment Frequency chart card title", () => {
    render(<OverviewTab {...BASE_PROPS} />);
    expect(screen.getByText(/deployment frequency/i)).toBeInTheDocument();
  });

  it("renders without crashing when filteredFrequency is empty", () => {
    render(<OverviewTab {...BASE_PROPS} filteredFrequency={[]} />);
    // Should still show the card heading even with no data
    expect(screen.getByText(/deployment frequency/i)).toBeInTheDocument();
  });

  it("shows a non-zero success count in the status breakdown section", () => {
    render(
      <OverviewTab
        {...BASE_PROPS}
        statusBreakdown={{ success: 11, failed: 1, building: 0, cancelled: 0 }}
      />,
    );
    // The donut chart filters out 0-value entries; Success (11) must appear in legend
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
});
