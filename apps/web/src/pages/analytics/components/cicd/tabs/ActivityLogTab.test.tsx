/**
 * Tests for cicd/tabs/ActivityLogTab.tsx
 *
 * Branches covered:
 *   Happy path     — run rows rendered from pagedRegister prop
 *   Empty state    — "No runs match" message when pagedRegister is empty
 *   Search input   — typing in the search box calls setSearch
 *   Pagination     — page count badge reflects filteredRegister.length
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AnalyticsLogTab from "./ActivityLogTab.js";

const RUN = {
  run_id: 101,
  workflow: "CI Pipeline",
  branch: "main",
  conclusion: "success",
  actor: "alice",
  event: "push",
  queue_min: 1,
  exec_min: 4,
  created_at: new Date().toISOString(),
  url: "https://github.com/acme/webapp/runs/101",
};

const BASE_PROPS = {
  filteredRegister: [RUN],
  workflowOptions: ["CI Pipeline"],
  branchOptions: ["main"],
  conclusionOptions: ["success"],
  workflowFilter: "all",
  setWorkflowFilter: vi.fn(),
  branchFilter: "all",
  setBranchFilter: vi.fn(),
  conclusionFilter: "all",
  setConclusionFilter: vi.fn(),
  search: "",
  setSearch: vi.fn(),
  pagedRegister: [RUN],
  registerPage: 1,
  setRegisterPage: vi.fn(),
  totalPages: 1,
};

describe("CICD ActivityLogTab", () => {
  it("renders the run row with workflow and branch values", () => {
    render(<AnalyticsLogTab {...BASE_PROPS} />);
    expect(screen.getByText("CI Pipeline")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("#101")).toBeInTheDocument();
  });

  it("shows 'No runs match' when pagedRegister is empty", () => {
    render(
      <AnalyticsLogTab
        {...BASE_PROPS}
        pagedRegister={[]}
        filteredRegister={[]}
      />,
    );
    expect(
      screen.getByText(/no runs match your selected filters/i),
    ).toBeInTheDocument();
  });

  it("calls setSearch when the user types in the search input", async () => {
    const setSearch = vi.fn();
    const user = userEvent.setup();
    render(<AnalyticsLogTab {...BASE_PROPS} setSearch={setSearch} />);

    await user.type(
      screen.getByPlaceholderText(/run id, actor, event/i),
      "alice",
    );

    await waitFor(() => expect(setSearch).toHaveBeenCalled());
  });

  it("shows the correct run count badge from filteredRegister.length", () => {
    render(<AnalyticsLogTab {...BASE_PROPS} />);
    expect(screen.getByText(/1 run/i)).toBeInTheDocument();
  });
});
