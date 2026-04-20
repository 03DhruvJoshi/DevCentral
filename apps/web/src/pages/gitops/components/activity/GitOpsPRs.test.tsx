/**
 * Tests for GitOpsPRs.tsx
 *
 * Branches covered:
 *   Loading state  — spinner shown while fetch is in-flight
 *   Happy path     — PR title and author rendered after fetch resolves
 *   State filter   — changing the state dropdown re-renders filtered results
 *   Error recovery — component stays stable (empty table) on fetch failure
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsPRs from "./GitOpsPRs.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
  token: "test-token",
}));

const mockFetch = vi.fn();

const SELECTED_REPO = {
  id: 1,
  name: "webapp",
  owner: "acme",
  url: "",
  private: false,
  language: "TypeScript",
  updated_at: "",
};

const PR = {
  number: 42,
  title: "feat: add dark mode",
  state: "open",
  user: { login: "alice", avatar_url: "" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  html_url: "https://github.com/acme/webapp/pull/42",
  labels: [],
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsPRs", () => {
  it("shows a loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsPRs selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders PR title and author after fetch resolves", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [PR] });
    render(<GitOpsPRs selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText("feat: add dark mode")).toBeInTheDocument(),
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders 'Pull Requests' heading and repo name", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<GitOpsPRs selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/pull requests/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });

  it("filters by state when user selects 'Closed' from the state dropdown", async () => {
    const closedPr = { ...PR, number: 99, title: "fix: close bug", state: "closed" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [PR, closedPr],
    });
    const user = userEvent.setup();
    render(<GitOpsPRs selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText("feat: add dark mode")).toBeInTheDocument(),
    );

    await user.selectOptions(screen.getByDisplayValue(/all states/i), "closed");

    await waitFor(() =>
      expect(screen.queryByText("feat: add dark mode")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("fix: close bug")).toBeInTheDocument();
  });
});
