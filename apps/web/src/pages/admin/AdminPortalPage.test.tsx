/**
 * Tests for AdminPortalPage.tsx
 *
 * Branches covered:
 *   Render         — page banner with "Admin Console" visible on mount
 *   Default tab    — Security tab content rendered by default
 *   Tab navigation — clicking Users tab swaps the visible tab panel
 *   Alert system   — success alert shown and auto-dismissed after 4 s
 */
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AdminPortalPage } from "./AdminPortalPage.js";

// ── Mock all heavy sub-components ────────────────────────────────────────────

vi.mock("./components/UserDirectory.js", () => ({
  UserDirectory: ({ onAlert }: { onAlert: (t: "success" | "error", m: string) => void }) => (
    <div>
      UserDirectory
      <button onClick={() => onAlert("success", "User deleted")}>
        trigger alert
      </button>
    </div>
  ),
}));
vi.mock("./components/AuditLogs.js", () => ({
  AuditLogs: () => <div>AuditLogs</div>,
}));
vi.mock("./components/FeatureFlags.js", () => ({
  FeatureFlags: () => <div>FeatureFlags</div>,
}));
vi.mock("./components/BroadcastSystem.js", () => ({
  BroadcastSystem: () => <div>BroadcastSystem</div>,
}));
vi.mock("./components/SecurityMetrics.js", () => ({
  default: () => <div>SecurityTab</div>,
}));
vi.mock("../../components/layout/UserProfile.js", () => ({
  default: () => <div>UserProfile</div>,
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPortalPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AdminPortalPage", () => {
  it("renders the page banner and Admin Console badge", () => {
    renderPage();

    expect(
      screen.getByText(/platform administration/i),
    ).toBeInTheDocument();
    // "Admin Console" appears in both the breadcrumb and the badge
    expect(screen.getAllByText("Admin Console").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Security tab content by default", () => {
    renderPage();

    expect(screen.getByText("SecurityTab")).toBeInTheDocument();
  });

  it("renders Users tab content after clicking the Users tab trigger", async () => {
    // Use real timers for this test — fake timers cause Radix Tab clicks to hang
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /users/i }));

    expect(screen.getByText("UserDirectory")).toBeInTheDocument();
  });

  it("shows a success alert banner that auto-dismisses after 4 seconds", async () => {
    // Spy on setTimeout but still call the real one — so userEvent and Radix UI
    // keep working. We capture callbacks with delay === 4000 for manual firing.
    const dismissCallbacks: Array<() => void> = [];
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((cb, delay, ...args) => {
        if (delay === 4000) {
          dismissCallbacks.push(cb as () => void);
        }
        return originalSetTimeout(cb, delay, ...args);
      });

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /users/i }));
    await user.click(screen.getByRole("button", { name: /trigger alert/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("User deleted")).toBeInTheDocument();

    // Fire the captured 4-second dismiss callback immediately
    act(() => {
      dismissCallbacks.forEach((cb) => cb());
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    setTimeoutSpy.mockRestore();
  });
});
