/**
 * Tests for GitOpsCommits.tsx
 *
 * Branches covered:
 *   Loading state — spinner shown while fetch is in-flight
 *   Happy path    — commit message and author rendered after fetch resolves
 *   Search filter — typing in search input filters results
 *   Error state   — component stays stable (empty list) on fetch failure
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsCommits from "./GitOpsCommits.js";

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

const COMMIT = {
  sha: "abc1234def5678",
  commit: {
    message: "fix: correct login redirect",
    author: { name: "Alice", date: new Date().toISOString() },
  },
  author: { login: "alice", avatar_url: "" },
  html_url: "https://github.com/acme/webapp/commit/abc1234",
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsCommits", () => {
  it("shows loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsCommits selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders commit message and author after fetch resolves", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [COMMIT] });
    render(<GitOpsCommits selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText(/fix: correct login redirect/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it("filters commits when user types in the search box", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        COMMIT,
        {
          ...COMMIT,
          sha: "xyz9999",
          commit: {
            ...COMMIT.commit,
            message: "chore: update deps",
          },
          author: { login: "bob", avatar_url: "" },
        },
      ],
    });
    const user = userEvent.setup();
    render(<GitOpsCommits selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText(/fix: correct login redirect/i),
      ).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText(/search by message, author, or sha/i),
      "chore",
    );

    await waitFor(() =>
      expect(
        screen.queryByText(/fix: correct login redirect/i),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/chore: update deps/i)).toBeInTheDocument();
  });

  it("renders 'Recent Commits' heading and repo name on fetch error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<GitOpsCommits selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/recent commits/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });
});
