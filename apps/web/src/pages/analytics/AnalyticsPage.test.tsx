/**
 * Tests for AnalyticsPage.tsx
 *
 * Branches covered:
 *   Page header      — "Developer Analytics" heading rendered
 *   Repo selector    — RepoAnalytics mock component rendered
 *   No-repo state    — placeholder shown when no repo selected
 *   Tab reveal       — Security / Velocity / CI/CD / Deployment tabs after selection
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AnalyticsPage } from "./AnalyticsPage.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

// RepoAnalytics renders a button that lets tests trigger repo selection
vi.mock("./components/RepoAnalytics.js", () => ({
  default: ({
    setSelectedRepo,
  }: {
    selectedRepo: unknown;
    setSelectedRepo: (r: unknown) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        setSelectedRepo({
          id: 42,
          name: "analytics-repo",
          owner: "octocat",
          url: "",
          private: false,
          language: "TypeScript",
          updated_at: new Date().toISOString(),
        })
      }
    >
      Select Repo
    </button>
  ),
}));

vi.mock("./components/security/SecurityAnalytics.js", () => ({
  default: () => <div>SecurityAnalytics</div>,
}));
vi.mock("./components/velocity/VelocityAnalytics.js", () => ({
  default: () => <div>VelocityAnalytics</div>,
}));
vi.mock("./components/cicd/CICDAnalytics.js", () => ({
  default: () => <div>CICDAnalytics</div>,
}));
vi.mock("./components/deployment/DeploymentAnalytics.js", () => ({
  default: () => <div>DeploymentAnalytics</div>,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AnalyticsPage", () => {
  it("renders the 'Developer Analytics' heading and the repo selector", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/developer analytics/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select repo/i }),
    ).toBeInTheDocument();
  });

  it("shows a placeholder prompt when no repository is selected", () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/no repository selected/i)).toBeInTheDocument();
  });

  it("shows all four analytics tabs once a repository is selected", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);

    await user.click(screen.getByRole("button", { name: /select repo/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /security metrics/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /quality & velocity/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /ci\/cd metrics/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /deployment metrics/i }),
      ).toBeInTheDocument();
    });
  });

  it("integration: switches tabs and renders matching analytics section content", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);

    await user.click(screen.getByRole("button", { name: /select repo/i }));

    await waitFor(() => {
      expect(screen.getByText("SecurityAnalytics")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /ci\/cd metrics/i }));

    await waitFor(() => {
      expect(screen.getByText("CICDAnalytics")).toBeInTheDocument();
    });
  });
});
