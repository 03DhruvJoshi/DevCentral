/**
 * Tests for DashboardContext.tsx
 *
 * Branches covered:
 *   Default value — DashboardProvider supplies "30d" as the initial dateRange
 *   State update  — setDateRange propagates the new value to consumers
 *   Guard hook    — useDashboardContext throws when called outside a provider
 */
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardProvider, useDashboardContext } from "./DashboardContext.js";

// Helper component that reads and displays the current context value
function ContextDisplay() {
  const { dateRange, setDateRange } = useDashboardContext();
  return (
    <div>
      <span data-testid="range">{dateRange}</span>
      <button onClick={() => setDateRange("7d")}>set 7d</button>
    </div>
  );
}

// Helper that intentionally uses the hook outside the provider
function OutsideConsumer() {
  useDashboardContext();
  return null;
}

function SecondaryConsumer() {
  const { dateRange } = useDashboardContext();
  return <p data-testid="secondary-range">{dateRange}</p>;
}

describe("DashboardContext", () => {
  it("provides '30d' as the default dateRange", () => {
    render(
      <DashboardProvider>
        <ContextDisplay />
      </DashboardProvider>,
    );

    expect(screen.getByTestId("range")).toHaveTextContent("30d");
  });

  it("setDateRange updates the value seen by consumers", () => {
    render(
      <DashboardProvider>
        <ContextDisplay />
      </DashboardProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /set 7d/i }).click();
    });

    expect(screen.getByTestId("range")).toHaveTextContent("7d");
  });

  it("useDashboardContext throws when rendered outside DashboardProvider", () => {
    // Suppress the React error-boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<OutsideConsumer />)).toThrow(
      "useDashboardContext must be used within a DashboardProvider",
    );

    consoleSpy.mockRestore();
  });

  it("integration: shares dateRange updates across multiple consumers under one provider", () => {
    render(
      <DashboardProvider>
        <ContextDisplay />
        <SecondaryConsumer />
      </DashboardProvider>,
    );

    expect(screen.getByTestId("secondary-range")).toHaveTextContent("30d");

    act(() => {
      screen.getByRole("button", { name: /set 7d/i }).click();
    });

    expect(screen.getByTestId("range")).toHaveTextContent("7d");
    expect(screen.getByTestId("secondary-range")).toHaveTextContent("7d");
  });
});
