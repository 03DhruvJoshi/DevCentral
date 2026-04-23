/**
 * Tests for CodeQualityChecks.tsx
 *
 * Branches covered:
 *   Loading state  — "Loading quality checks..." shown when isLoading is true
 *   No issues      — "Code quality standards met" shown when issues list is empty
 *   With issues    — issue description and Critical badge rendered
 *   Null health    — component renders nothing (returns null) when health is null
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CodeQualityChecks from "./CodeQualityChecks.js";

const HEALTH_NO_ISSUES = {
  healthStatus: "green",
  overallScore: 85,
  securityScore: 22,
  codeQualityScore: 25,
  deploymentReadinessScore: 20,
  teamOwnershipScore: 18,
  securityIssues: [],
  codeQualityIssues: [],
  deploymentReadinessIssues: [],
  teamOwnershipIssues: [],
};

const HEALTH_WITH_ISSUE = {
  ...HEALTH_NO_ISSUES,
  codeQualityScore: 10,
  codeQualityIssues: [
    {
      severity: "critical",
      description: "Test coverage below 60%",
    },
  ],
};

describe("CodeQualityChecks", () => {
  it("shows loading indicator when isLoading is true", () => {
    render(<CodeQualityChecks health={null} isLoading={true} />);
    expect(screen.getByText(/loading quality checks/i)).toBeInTheDocument();
  });

  it("shows 'Code quality standards met' when there are no issues", () => {
    render(<CodeQualityChecks health={HEALTH_NO_ISSUES} />);
    expect(
      screen.getByText(/code quality standards met/i),
    ).toBeInTheDocument();
  });

  it("renders an issue description and Critical badge when issues exist", () => {
    render(<CodeQualityChecks health={HEALTH_WITH_ISSUE} />);
    expect(
      screen.getByText(/test coverage below 60%/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders nothing when health is null and not loading", () => {
    const { container } = render(
      <CodeQualityChecks health={null} isLoading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
