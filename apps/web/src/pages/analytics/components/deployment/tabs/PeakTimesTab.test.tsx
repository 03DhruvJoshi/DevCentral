/**
 * Tests for deployment/tabs/PeakTimesTab.tsx
 *
 * Branches covered:
 *   Card headings  — "Deployments by Hour" and "Deployments by Day" titles rendered
 *   Empty charts   — renders without crashing when peakHours and weekdayDist are empty
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PeakTimesTab from "./PeakTimesTab.js";

const BASE_SUMMARY = {
  totalDeploys: 12,
  successRate: 91.7,
  avgDurationSec: 60,
  deploysPerDay: 0.4,
  failedDeploys: 1,
  mttrMin: 15,
};

const BASE_PROPS = {
  summary: BASE_SUMMARY,
  peakHours: [],
  weekdayDist: [],
};

describe("Deployment PeakTimesTab", () => {
  it("renders 'Deployments by Hour' card title", () => {
    render(<PeakTimesTab {...BASE_PROPS} />);
    expect(screen.getByText(/deployments by hour/i)).toBeInTheDocument();
  });

  it("renders 'Deployments by Day' card title", () => {
    render(<PeakTimesTab {...BASE_PROPS} />);
    expect(screen.getByText(/deployments by day/i)).toBeInTheDocument();
  });

  it("renders without crashing when all data arrays are empty", () => {
    const { container } = render(<PeakTimesTab {...BASE_PROPS} />);
    expect(container).toBeTruthy();
  });
});
