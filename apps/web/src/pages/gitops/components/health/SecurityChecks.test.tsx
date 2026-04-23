/**
 * Tests for SecurityChecks.tsx
 *
 * Branches covered:
 *   Loading state — "Loading..." shown when isLoading is true
 *   No issues     — "All security checks passed" when issues list is empty
 *   With issues   — issue description and Critical badge rendered
 *   Null health   — component renders nothing when health is null and not loading
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SecurityChecks from "./SecurityChecks.js";

const HEALTH_NO_ISSUES = {
  healthStatus: "green",
  overallScore: 85,
  securityScore: 25,
  codeQualityScore: 22,
  deploymentReadinessScore: 20,
  teamOwnershipScore: 18,
  securityIssues: [],
  codeQualityIssues: [],
  deploymentReadinessIssues: [],
  teamOwnershipIssues: [],
};

const HEALTH_WITH_ISSUE = {
  ...HEALTH_NO_ISSUES,
  securityScore: 10,
  securityIssues: [
    { severity: "critical", description: "Branch protection not enabled" },
  ],
};

describe("SecurityChecks", () => {
  it("shows loading indicator when isLoading is true", () => {
    render(<SecurityChecks health={null} isLoading={true} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows 'All security checks passed' when there are no issues", () => {
    render(<SecurityChecks health={HEALTH_NO_ISSUES} />);
    expect(
      screen.getByText(/all security checks passed/i),
    ).toBeInTheDocument();
  });

  it("renders an issue description and Critical badge when issues exist", () => {
    render(<SecurityChecks health={HEALTH_WITH_ISSUE} />);
    expect(
      screen.getByText(/branch protection not enabled/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders nothing when health is null and not loading", () => {
    const { container } = render(
      <SecurityChecks health={null} isLoading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
