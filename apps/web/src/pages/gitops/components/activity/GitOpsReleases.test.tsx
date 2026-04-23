/**
 * Tests for GitOpsReleases.tsx
 *
 * Branches covered:
 *   Loading state — spinner shown while fetch is in-flight
 *   Happy path    — release name and tag rendered after fetch resolves
 *   Error state   — component renders heading even when fetch fails
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsReleases from "./GitOpsReleases.js";

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

const RELEASE = {
  id: 1001,
  name: "v1.2.0 - Feature Release",
  tag_name: "v1.2.0",
  draft: false,
  prerelease: false,
  created_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  html_url: "https://github.com/acme/webapp/releases/tag/v1.2.0",
  author: { login: "alice", avatar_url: "" },
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsReleases", () => {
  it("shows a loading spinner while fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsReleases selectedRepo={SELECTED_REPO} />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders release name and tag after fetch resolves", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [RELEASE] });
    render(<GitOpsReleases selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByText("v1.2.0 - Feature Release"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
  });

  it("renders the Releases heading even when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<GitOpsReleases selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(screen.getByText(/releases/i)).toBeInTheDocument(),
    );
  });
});
