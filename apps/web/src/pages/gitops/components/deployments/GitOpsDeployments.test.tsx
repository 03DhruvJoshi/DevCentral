/**
 * Tests for GitOpsDeployments.tsx
 *
 * Branches covered:
 *   Tab triggers   — Environments and Manual Deployment tabs rendered
 *   Initial fetch  — fetch is called for environments, deployments, and workflows
 *   Parallel fetch — component mounts without errors even when all fetches fail
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsDeployments from "./GitOpsDeployments.js";

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

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GitOpsDeployments", () => {
  it("renders Environments and Manual Deployment tab triggers", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<GitOpsDeployments selectedRepo={SELECTED_REPO} />);

    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: /environments/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("tab", { name: /manual deployment/i }),
    ).toBeInTheDocument();
  });

  it("fires multiple fetches on mount for environments, deployments, and workflows", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<GitOpsDeployments selectedRepo={SELECTED_REPO} />);

    await waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThan(2));

    const urls = mockFetch.mock.calls.map(([url]: [string]) => url);
    expect(urls.some((u) => u.includes("environments"))).toBe(true);
    expect(urls.some((u) => u.includes("deployments"))).toBe(true);
    expect(urls.some((u) => u.includes("workflows"))).toBe(true);
  });

  it("renders without crashing when all fetches fail", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const { container } = render(
      <GitOpsDeployments selectedRepo={SELECTED_REPO} />,
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeTruthy();
  });
});
