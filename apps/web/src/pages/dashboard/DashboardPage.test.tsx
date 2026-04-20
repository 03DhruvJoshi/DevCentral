/**
 * Tests for DashboardPage.tsx
 *
 * Branches covered:
 *   Loading state       — spinner shown while preferences fetch is in-flight
 *   Saved layout        — widget labels from API response rendered in the grid
 *   Default layout      — falls back to built-in widgets on empty API response
 *   Manage Widgets      — clicking the button opens the Widget Catalog dialog
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DashboardPage } from "./DashboardPage.js";

// ── Mock all heavy widget components ─────────────────────────────────────────

vi.mock("./components/ActionsWidget.js", () => ({
  ActionsWidget: () => <div>ActionsWidget</div>,
}));
vi.mock("./components/QuickScaffolderWidget.js", () => ({
  QuickScaffoldWidget: () => <div>QuickScaffoldWidget</div>,
}));
vi.mock("./components/RepoPulseWidget.js", () => ({
  RepoPulseWidget: () => <div>RepoPulseWidget</div>,
}));
vi.mock("./components/PRVelocityWidget.js", () => ({
  PRVelocityWidget: () => <div>PRVelocityWidget</div>,
}));
vi.mock("./components/DeliveryHealthWidget.js", () => ({
  DeliveryHealthWidget: () => <div>DeliveryHealthWidget</div>,
}));
vi.mock("./components/PlatformSummaryWidget.js", () => ({
  PlatformSummaryWidget: () => <div>PlatformSummaryWidget</div>,
}));
vi.mock("./components/DeploymentFeedWidget.js", () => ({
  DeploymentFeedWidget: () => <div>DeploymentFeedWidget</div>,
}));
vi.mock("./components/RecentActivityWidget.js", () => ({
  RecentActivityWidget: () => <div>RecentActivityWidget</div>,
}));

// ── Mock react-grid-layout so the drag-and-drop grid renders safely in jsdom ─

vi.mock("react-grid-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="grid-layout">{children}</div>
  ),
}));

// ── Shared fetch mock ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
  localStorage.setItem(
    "devcentral_user",
    JSON.stringify({ name: "Alice Dev", role: "DEV" }),
  );
});

describe("DashboardPage", () => {
  it("shows a loading spinner while the preferences fetch is in-flight", () => {
    // Never resolves → stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders widget labels from the saved layout returned by the API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        widgets: [
          { i: "platform-summary", x: 0, y: 0, w: 3, h: 2 },
          { i: "deployment-feed", x: 0, y: 2, w: 2, h: 2 },
        ],
      }),
    });
    // Second fetch from debounced save — just resolve cleanly
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Platform Overview")).toBeInTheDocument();
      expect(screen.getByText("Deployment Feed")).toBeInTheDocument();
    });
  });

  it("renders the default layout when the API returns no saved widgets", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ widgets: [] }),
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(<DashboardPage />);

    await waitFor(() => {
      // "platform-summary" is always in the default layout
      expect(screen.getByText("Platform Overview")).toBeInTheDocument();
    });
  });

  it("opens the Widget Catalog dialog when 'Manage Widgets' is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ widgets: [{ i: "platform-summary", x: 0, y: 0, w: 3, h: 2 }] }),
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /manage widgets/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /manage widgets/i }));

    await waitFor(() => {
      expect(screen.getByText("Widget Catalog")).toBeInTheDocument();
    });
  });
});
