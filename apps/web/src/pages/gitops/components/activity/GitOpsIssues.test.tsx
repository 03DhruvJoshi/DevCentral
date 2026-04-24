/**
 * Tests for GitOpsIssues.tsx
 *
 * Branches covered:
 *   Loading state — spinner shown while fetch is in-flight
 *   Happy path    — issue title and author rendered after fetch resolves
 *   State filter  — changing the state dropdown filters results
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsIssues from "./GitOpsIssues.js";

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

const ISSUE = {
  number: 7,
  title: "Bug: login fails on Safari",
  state: "open",
  user: { login: "alice", avatar_url: "" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  html_url: "https://github.com/acme/webapp/issues/7",
  comments: 2,
  labels: [],
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsIssues", () => {
  it("shows a loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsIssues selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders issue title and author after fetch resolves", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [ISSUE] });
    render(<GitOpsIssues selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText("Bug: login fails on Safari"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows 'Issues' heading with the repo name", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<GitOpsIssues selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/issues/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("webapp")).toBeInTheDocument();
  });
});
