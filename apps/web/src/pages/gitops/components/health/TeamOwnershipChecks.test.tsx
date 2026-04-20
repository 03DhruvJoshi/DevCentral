/**
 * Tests for TeamOwnershipChecks.tsx
 *
 * Branches covered:
 *   Loading state — spinner + "Loading ownership checks..." when isLoading is true
 *   No issues     — "Team and ownership well defined" when issues list is empty
 *   With issues   — issue description and Warning badge rendered
 *   Null health   — component renders nothing when health is null and not loading
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TeamOwnershipChecks from "./TeamOwnershipChecks.js";

const HEALTH_NO_ISSUES = {
  healthStatus: "green",
  overallScore: 85,
  securityScore: 22,
  codeQualityScore: 22,
  deploymentReadinessScore: 22,
  teamOwnershipScore: 19,
  securityIssues: [],
  codeQualityIssues: [],
  deploymentReadinessIssues: [],
  teamOwnershipIssues: [],
};

const HEALTH_WITH_ISSUE = {
  ...HEALTH_NO_ISSUES,
  teamOwnershipScore: 10,
  teamOwnershipIssues: [
    { severity: "warning", description: "No CODEOWNERS file found" },
  ],
};

describe("TeamOwnershipChecks", () => {
  it("shows loading indicator when isLoading is true", () => {
    render(<TeamOwnershipChecks health={null} isLoading={true} />);
    expect(screen.getByText(/loading ownership checks/i)).toBeInTheDocument();
  });

  it("shows 'Team and ownership well defined' when there are no issues", () => {
    render(<TeamOwnershipChecks health={HEALTH_NO_ISSUES} />);
    expect(
      screen.getByText(/team and ownership well defined/i),
    ).toBeInTheDocument();
  });

  it("renders an issue description and Warning badge when issues exist", () => {
    render(<TeamOwnershipChecks health={HEALTH_WITH_ISSUE} />);
    expect(screen.getByText(/no codeowners file found/i)).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders nothing when health is null and not loading", () => {
    const { container } = render(
      <TeamOwnershipChecks health={null} isLoading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
