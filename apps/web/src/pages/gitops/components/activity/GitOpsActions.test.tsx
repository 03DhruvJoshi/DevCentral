/**
 * Tests for GitOpsActions.tsx
 *
 * Branches covered:
 *   Loading state — spinner shown while fetch is in-flight
 *   Happy path    — workflow name and actor rendered after fetch resolves
 *   Error state   — component renders heading even when fetch fails
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsActions from "./GitOpsActions.js";

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

const PIPELINE = {
  id: 5001,
  name: "CI Pipeline",
  head_branch: "main",
  head_sha: "abc1234",
  status: "completed",
  conclusion: "success",
  event: "push",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  html_url: "https://github.com/acme/webapp/actions/runs/5001",
  actor: { login: "alice", avatar_url: "" },
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsActions", () => {
  it("shows a loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsActions selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders workflow name and actor after fetch resolves", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [PIPELINE] }),
    });
    render(<GitOpsActions selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText("CI Pipeline")).toBeInTheDocument(),
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders the Actions heading even when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<GitOpsActions selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/github actions/i)).toBeInTheDocument(),
    );
  });
});
