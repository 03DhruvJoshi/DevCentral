/**
 * Tests for GitOpsPage.tsx
 *
 * Branches covered:
 *   Auth redirect    — navigate('/login') called when no token in localStorage
 *   Page header      — "GitOps Control Plane" heading rendered
 *   Repo selector    — GitOpsRepos mock component rendered
 *   Tab reveal       — Health / Activity / Deployments tabs appear after repo selection
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GitOpsPage } from "./GitOpsPage.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("./components/types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
  token: "test-token",
}));

// All health / activity / deployment sub-components mocked as simple stubs
vi.mock("./components/health/RepositoryHealthCard.js", () => ({
  default: () => <div>RepositoryHealthCard</div>,
}));
vi.mock("./components/health/SecurityChecks.js", () => ({
  default: () => <div>SecurityChecks</div>,
}));
vi.mock("./components/health/CodeQualityChecks.js", () => ({
  default: () => <div>CodeQualityChecks</div>,
}));
vi.mock("./components/health/DeploymentReadinessChecks.js", () => ({
  default: () => <div>DeploymentReadinessChecks</div>,
}));
vi.mock("./components/health/TeamOwnershipChecks.js", () => ({
  default: () => <div>TeamOwnershipChecks</div>,
}));
vi.mock("./components/health/QuickFixActions.js", () => ({
  default: () => <div>QuickFixActions</div>,
}));
vi.mock("./components/activity/GitOpsActions.js", () => ({
  default: () => <div>GitOpsActions</div>,
}));
vi.mock("./components/activity/GitOpsReleases.js", () => ({
  default: () => <div>GitOpsReleases</div>,
}));
vi.mock("./components/activity/GitOpsCommits.js", () => ({
  default: () => <div>GitOpsCommits</div>,
}));
vi.mock("./components/activity/GitOpsIssues.js", () => ({
  default: () => <div>GitOpsIssues</div>,
}));
vi.mock("./components/deployments/GitOpsDeployments.js", () => ({
  default: () => <div>GitOpsDeployments</div>,
}));

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockNavigate.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.clear();
});

describe("GitOpsPage", () => {
  it("calls navigate('/login') when there is no token in localStorage", () => {
    render(<GitOpsPage />);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("renders the 'GitOps Control Plane' heading when the user is authenticated", async () => {
    localStorage.setItem("devcentral_token", "valid-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<GitOpsPage />);

    expect(screen.getByText(/gitops control plane/i)).toBeInTheDocument();
    expect(screen.getByText(/active repository/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /no repositories found/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows the Health / Activity / Deployments tabs once a repository is selected", async () => {
    localStorage.setItem("devcentral_token", "valid-token");
    mockFetch.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/pulls")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 12,
              number: 12,
              title: "feat: integration-ready pipeline",
              state: "open",
              created_at: "2026-04-01T10:00:00.000Z",
              html_url: "https://github.com/octocat/repo-two/pull/12",
              user: {
                login: "octocat",
                avatar_url: "https://example.com/avatar.png",
              },
            },
          ],
        };
      }

      if (url.includes("/api/github/repos")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              name: "my-repo",
              owner: "octocat",
              url: "https://github.com/octocat/my-repo",
              private: false,
              language: "TypeScript",
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (url.includes("/health")) {
        return {
          ok: true,
          json: async () => ({ totalScore: 80, healthStatus: "green" }),
        };
      }

      throw new Error(`Unhandled fetch URL: ${url}`);
    });

    render(<GitOpsPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /health/i })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /activity/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /deployments/i }),
      ).toBeInTheDocument();
    });
  });

  it("gracefully handles a failed health fetch and keeps the page rendered", async () => {
    localStorage.setItem("devcentral_token", "valid-token");
    mockFetch.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/github/repos")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              name: "my-repo",
              owner: "octocat",
              url: "https://github.com/octocat/my-repo",
              private: false,
              language: "TypeScript",
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (url.includes("/health")) {
        throw new Error("Network error");
      }

      throw new Error(`Unhandled fetch URL: ${url}`);
    });

    render(<GitOpsPage />);

    // Tabs should still appear even when the health fetch fails
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /health/i })).toBeInTheDocument();
    });
  });

  it("integration: uses real repository selector and real PR tab child to show PR data flow", async () => {
    localStorage.setItem("devcentral_token", "valid-token");
    mockFetch.mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/github/repos")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              number: 1,
              title: "repo-one",
              state: "open",
              created_at: "2026-04-01T09:00:00.000Z",
              html_url: "https://github.com/octocat/repo-one/pull/1",
              user: {
                login: "octocat",
                avatar_url: "https://example.com/avatar.png",
              },
              name: "repo-one",
              owner: "octocat",
              url: "https://github.com/octocat/repo-one",
              private: false,
              language: "TypeScript",
              updated_at: new Date().toISOString(),
            },
            {
              id: 2,
              number: 2,
              title: "feat: integration-ready pipeline",
              state: "open",
              created_at: "2026-04-01T10:00:00.000Z",
              html_url: "https://github.com/octocat/repo-two/pull/12",
              user: {
                login: "octocat",
                avatar_url: "https://example.com/avatar.png",
              },
              name: "repo-two",
              owner: "octocat",
              url: "https://github.com/octocat/repo-two",
              private: false,
              language: "TypeScript",
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (url.includes("/health")) {
        return {
          ok: true,
          json: async () => ({ totalScore: 88, healthStatus: "green" }),
        };
      }

      throw new Error(`Unhandled fetch URL: ${url}`);
    });

    const user = userEvent.setup();
    render(<GitOpsPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /repo-two/i }),
      ).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole("combobox"), "2");
    await user.click(screen.getByRole("tab", { name: /activity/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /pull requests/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/integration-ready pipeline/i),
      ).toBeInTheDocument();
    });
  });
});
