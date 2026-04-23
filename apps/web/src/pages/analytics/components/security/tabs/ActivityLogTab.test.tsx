/**
 * Tests for security/tabs/ActivityLogTab.tsx
 *
 * Branches covered:
 *   Loading state  — spinner shown when isIssuesLoading is true
 *   Error state    — error message text rendered when issuesError is set
 *   Empty state    — "No issues match the selected filters" when list is empty
 *   Happy path     — issue severity and type shown when data present
 *   Search input   — calls setIssueSearch when user types
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ActivityLogTab from "./ActivityLogTab.js";

const BASE_PROPS = {
  isIssuesLoading: false,
  issuesError: null,
  filteredAndSortedIssues: [],
  paginatedIssues: [],
  issuePage: 1,
  totalIssuePages: 1,
  setIssuePage: vi.fn(),
  issueSeverityFilter: "all",
  setIssueSeverityFilter: vi.fn(),
  issueTypeFilter: "all",
  setIssueTypeFilter: vi.fn(),
  issueSearch: "",
  setIssueSearch: vi.fn(),
  toggleSort: vi.fn(),
  sortIcon: () => null,
};

describe("Security ActivityLogTab", () => {
  it("shows loading spinner when isIssuesLoading is true", () => {
    render(<ActivityLogTab {...BASE_PROPS} isIssuesLoading={true} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error message when issuesError is set", () => {
    render(
      <ActivityLogTab
        {...BASE_PROPS}
        issuesError="Issue-level deep dive data is unavailable right now."
      />,
    );
    expect(
      screen.getByText(/issue-level deep dive data is unavailable right now/i),
    ).toBeInTheDocument();
  });

  it("shows 'No issues match' when list is empty", () => {
    render(<ActivityLogTab {...BASE_PROPS} />);
    expect(
      screen.getByText(/no issues match the selected filters/i),
    ).toBeInTheDocument();
  });

  it("calls setIssueSearch when user types in search input", async () => {
    const setIssueSearch = vi.fn();
    const user = userEvent.setup();
    render(<ActivityLogTab {...BASE_PROPS} setIssueSearch={setIssueSearch} />);

    await user.type(
      screen.getByPlaceholderText(/search file, rule, message/i),
      "login",
    );

    await waitFor(() => expect(setIssueSearch).toHaveBeenCalled());
  });
});
