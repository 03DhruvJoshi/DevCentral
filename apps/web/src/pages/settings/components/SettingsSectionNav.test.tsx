/**
 * Tests for SettingsSectionNav.tsx
 *
 * Branches covered:
 *   Render nav items     — all nav labels (General, Integrations, Preferences) rendered
 *   Active highlight     — active section button is visually distinct (has bg-slate-100 class)
 *   Click interaction    — clicking a nav item fires onSectionChange with the correct id
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SettingsSectionNav } from "./SettingsSectionNav.js";

describe("SettingsSectionNav", () => {
  it("renders all nav item labels", () => {
    render(
      <SettingsSectionNav activeSection="general" onSectionChange={vi.fn()} />,
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
  });

  it("applies the active style only to the active section button", () => {
    render(
      <SettingsSectionNav
        activeSection="integrations"
        onSectionChange={vi.fn()}
      />,
    );

    const integrationsBtn = screen.getByRole("button", { name: /integrations/i });
    expect(integrationsBtn.className).toContain("bg-slate-100");

    const generalBtn = screen.getByRole("button", { name: /general/i });
    expect(generalBtn.className).not.toContain("bg-slate-100");
  });

  it("calls onSectionChange with the correct id when a nav item is clicked", async () => {
    const onSectionChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsSectionNav activeSection="general" onSectionChange={onSectionChange} />,
    );

    await user.click(screen.getByRole("button", { name: /integrations/i }));
    expect(onSectionChange).toHaveBeenCalledWith("integrations");
  });
});
