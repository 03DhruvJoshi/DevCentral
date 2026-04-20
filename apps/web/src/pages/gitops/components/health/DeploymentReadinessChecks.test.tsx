/**
 * Tests for DeploymentReadinessChecks.tsx
 *
 * Branches covered:
 *   Loading state — "Loading deployment checks..." shown when isLoading is true
 *   No issues     — "Ready for deployment" shown when issues list is empty
 *   With issues   — issue description and Critical badge rendered
 *   Null health   — component renders nothing when health is null and not loading
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DeploymentReadinessChecks from "./DeploymentReadinessChecks.js";

const HEALTH_NO_ISSUES = {
  healthStatus: "green",
  overallScore: 85,
  securityScore: 22,
  codeQualityScore: 22,
  deploymentReadinessScore: 25,
  teamOwnershipScore: 16,
  securityIssues: [],
  codeQualityIssues: [],
  deploymentReadinessIssues: [],
  teamOwnershipIssues: [],
};

const HEALTH_WITH_ISSUE = {
  ...HEALTH_NO_ISSUES,
  deploymentReadinessScore: 12,
  deploymentReadinessIssues: [
    { severity: "critical", description: "No CI/CD pipeline detected" },
  ],
};

describe("DeploymentReadinessChecks", () => {
  it("shows loading indicator when isLoading is true", () => {
    render(<DeploymentReadinessChecks health={null} isLoading={true} />);
    expect(screen.getByText(/loading deployment checks/i)).toBeInTheDocument();
  });

  it("shows 'Ready for deployment' when there are no issues", () => {
    render(<DeploymentReadinessChecks health={HEALTH_NO_ISSUES} />);
    expect(screen.getByText(/ready for deployment/i)).toBeInTheDocument();
  });

  it("renders an issue description and Critical badge when issues exist", () => {
    render(<DeploymentReadinessChecks health={HEALTH_WITH_ISSUE} />);
    expect(
      screen.getByText(/no ci\/cd pipeline detected/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders nothing when health is null and not loading", () => {
    const { container } = render(
      <DeploymentReadinessChecks health={null} isLoading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
