/**
 * Tests for SettingsPage.tsx
 *
 * Branches covered:
 *   Page header       — "Developer Settings" heading rendered
 *   Default section   — GeneralSection shown immediately on mount
 *   Nav interaction   — clicking Integrations switches visible section
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsPage } from "./SettingsPage.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("./components/sections/GeneralSection.js", () => ({
  GeneralSection: () => <div>GeneralSection</div>,
}));
vi.mock("./components/sections/IntegrationsSection.js", () => ({
  IntegrationsSection: () => <div>IntegrationsSection</div>,
}));
vi.mock("./components/sections/PreferencesSection.js", () => ({
  PreferencesSection: () => <div>PreferencesSection</div>,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

describe("SettingsPage", () => {
  it("renders the 'Developer Settings' heading", () => {
    render(<SettingsPage />);

    expect(screen.getByText(/developer settings/i)).toBeInTheDocument();
  });

  it("shows GeneralSection by default", () => {
    render(<SettingsPage />);

    expect(screen.getByText("GeneralSection")).toBeInTheDocument();
    expect(screen.queryByText("IntegrationsSection")).not.toBeInTheDocument();
    expect(screen.queryByText("PreferencesSection")).not.toBeInTheDocument();
  });

  it("shows IntegrationsSection after clicking the Integrations nav button", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /integrations/i }));

    expect(screen.getByText("IntegrationsSection")).toBeInTheDocument();
    expect(screen.queryByText("GeneralSection")).not.toBeInTheDocument();
  });
});
