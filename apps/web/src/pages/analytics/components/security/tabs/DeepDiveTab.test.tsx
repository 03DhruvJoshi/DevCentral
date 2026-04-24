/**
 * Tests for security/tabs/DeepDiveTab.tsx
 *
 * Branches covered:
 *   Section headings — "Analysis Filters" card title rendered
 *   Severity filter  — Severity Scope select visible and calls setSeverityScope
 *   Risk snapshot    — riskSnapshotText content rendered
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import DeepDiveTab from "./DeepDiveTab.js";

const BASE_PROPS = {
  issueInsights: null,
  blockerCount: 0,
  criticalCount: 1,
  majorCount: 3,
  minorCount: 5,
  vulnerabilityTypeCount: 0,
  bugTypeCount: 2,
  codeSmellTypeCount: 7,
  securityHotspots: 1,
  paginatedTopFiles: [],
  paginatedTopRules: [],
  topFiles: [],
  topRules: [],
  topFilesPage: 1,
  setTopFilesPage: vi.fn(),
  topFilesTotalPages: 1,
  topRulesPage: 1,
  setTopRulesPage: vi.fn(),
  topRulesTotalPages: 1,
  valueMode: "absolute" as const,
  setValueMode: vi.fn(),
  severityScope: "all" as const,
  setSeverityScope: vi.fn(),
  hideZeroSeries: true,
  setHideZeroSeries: vi.fn(),
  metrics: {
    sqale_index: "120",
    sqale_rating: "A",
    reliability_rating: "A",
    security_rating: "A",
    coverage: "85.0",
    duplicated_lines_density: "3.2",
  },
  formatTechDebt: (v: number) => `${v}min`,
  duplicatedLinesDensity: 3.2,
  coverageValue: 85,
  coverageData: [
    { name: "Covered", value: 85, fill: "#10b981" },
    { name: "Uncovered", value: 15, fill: "#f1f5f9" },
  ],
  riskSnapshotText:
    "Low risk posture. Maintain momentum by addressing remaining hotspots.",
};

describe("Security DeepDiveTab", () => {
  it("renders the Analysis Filters card heading", () => {
    render(<DeepDiveTab {...BASE_PROPS} />);
    expect(screen.getByText(/analysis filters/i)).toBeInTheDocument();
  });

  it("calls setSeverityScope when the severity select changes", async () => {
    const setSeverityScope = vi.fn();
    const user = userEvent.setup();
    render(<DeepDiveTab {...BASE_PROPS} setSeverityScope={setSeverityScope} />);

    await user.selectOptions(
      screen.getByDisplayValue(/all severity levels/i),
      "critical",
    );

    await waitFor(() => expect(setSeverityScope).toHaveBeenCalledWith("critical"));
  });

  it("renders the risk snapshot text", () => {
    render(<DeepDiveTab {...BASE_PROPS} />);
    expect(
      screen.getByText(/low risk posture/i),
    ).toBeInTheDocument();
  });
});
