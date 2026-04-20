/**
 * Tests for RepoPulseWidget.tsx
 *
 * Branches covered:
 *   Loading state      — "Loading issues…" text shown while fetch is in-flight
 *   Happy path         — issue titles rendered after successful response
 *   State filter       — clicking "All" includes closed issues
 *   Refresh button     — clicking refresh triggers a new fetch
 *   Error state        — error message rendered when API returns 503
 *   Empty issues       — "No issues found" shown when list is empty
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RepoPulseWidget } from "./RepoPulseWidget.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

const mockFetch = vi.fn();

const REPOS = [{ id: 1, name: "webapp", owner: "acme" }];

const ISSUES = [
  {
    id: 1,
    number: 42,
    title: "Fix login bug",
    state: "open" as const,
    created_at: new Date().toISOString(),
    html_url: "https://github.com/acme/webapp/issues/42",
    pull_request: undefined,
  },
  {
    id: 2,
    number: 43,
    title: "Improve performance",
    state: "closed" as const,
    created_at: new Date().toISOString(),
    html_url: "https://github.com/acme/webapp/issues/43",
    pull_request: undefined,
  },
];

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("RepoPulseWidget", () => {
  it("shows loading text while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<RepoPulseWidget />);
    expect(screen.getByText(/loading issues/i)).toBeInTheDocument();
  });

  it("renders open issue titles after a successful API response", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok(ISSUES));

    render(<RepoPulseWidget />);

    await waitFor(() =>
      expect(screen.getByText("Fix login bug")).toBeInTheDocument(),
    );
  });

  it("shows closed issues when the 'All' filter is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok(ISSUES));

    const user = userEvent.setup();
    render(<RepoPulseWidget />);

    await waitFor(() =>
      expect(screen.getByText("Fix login bug")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /^all$/i }));

    await waitFor(() =>
      expect(screen.getByText("Improve performance")).toBeInTheDocument(),
    );
  });

  it("calls the issues endpoint again when the refresh button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok(ISSUES))
      .mockResolvedValueOnce(ok(ISSUES));

    const user = userEvent.setup();
    render(<RepoPulseWidget />);

    await waitFor(() =>
      expect(screen.getByText("Fix login bug")).toBeInTheDocument(),
    );

    const callsBefore = mockFetch.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /refresh issues/i }));

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("renders an error message when the issues API returns 503", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    render(<RepoPulseWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load github issues/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'No issues found' when the issues list is empty", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(REPOS))
      .mockResolvedValueOnce(ok([]));

    render(<RepoPulseWidget />);

    await waitFor(() =>
      expect(screen.getByText(/no issues found/i)).toBeInTheDocument(),
    );
  });
});
