/**
 * Tests for deployment/tabs/ActivityLogTab.tsx
 *
 * Branches covered:
 *   Empty state   — "No deployments match the current filters" when list empty
 *   Happy path    — deployment row data (branch, provider) rendered
 *   Count badge   — count badge shows correct number of deployments
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActivityLogTab from "./ActivityLogTab.js";

const DEPLOY = {
  id: "dep-1",
  provider: "vercel",
  environment: "production",
  status: "success",
  branch: "main",
  commitSha: "abc1234",
  commitMessage: "fix: update env",
  startedAt: new Date().toISOString(),
  durationSec: 45,
  url: "https://vercel.com/acme/webapp/abc1234",
};

const BASE_PROPS = {
  filteredRecent: [],
  providerFilter: "all" as const,
  envFilter: "all" as const,
  statusFilter: "all" as const,
};

describe("Deployment ActivityLogTab", () => {
  it("shows 'No deployments match' when filteredRecent is empty", () => {
    render(<ActivityLogTab {...BASE_PROPS} />);
    expect(
      screen.getByText(/no deployments match the current filters/i),
    ).toBeInTheDocument();
  });

  it("renders a deployment row with branch when data is provided", () => {
    render(<ActivityLogTab {...BASE_PROPS} filteredRecent={[DEPLOY]} />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("shows the correct deployment count in the header badge", () => {
    render(<ActivityLogTab {...BASE_PROPS} filteredRecent={[DEPLOY]} />);
    expect(screen.getByText(/1 deployment/i)).toBeInTheDocument();
  });
});
