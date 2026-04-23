/**
 * Tests for QuickScaffolderWidget.tsx
 *
 * Branches covered:
 *   Loading state      — spinner shown while fetch is in-flight
 *   Happy path         — template cards rendered after successful response
 *   Category filter    — clicking a category button filters the template list
 *   Search filter      — typing in the search box filters templates
 *   Empty search       — "No templates match" message shown when search yields nothing
 *   Error state        — error message rendered when API returns 503
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickScaffoldWidget } from "./QuickScaffolderWidget.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

const mockFetch = vi.fn();

const TEMPLATES = [
  { id: 1, title: "React App", description: "A React starter", categoryName: "Frontend" },
  { id: 2, title: "Node API", description: "A Node.js API", categoryName: "Backend" },
  { id: 3, title: "ML Model", description: "Python ML template", categoryName: "AI" },
];

const CATEGORIES = [
  { id: 1, name: "Frontend" },
  { id: 2, name: "Backend" },
  { id: 3, name: "AI" },
];

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("QuickScaffoldWidget", () => {
  it("shows a loading spinner while fetches are in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<QuickScaffoldWidget />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders template cards after a successful API response", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(TEMPLATES))
      .mockResolvedValueOnce(ok(CATEGORIES));

    render(<QuickScaffoldWidget />);

    await waitFor(() =>
      expect(screen.getByText("React App")).toBeInTheDocument(),
    );
    expect(screen.getByText("Node API")).toBeInTheDocument();
  });

  it("filters templates to the selected category when a category button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(TEMPLATES))
      .mockResolvedValueOnce(ok(CATEGORIES));

    const user = userEvent.setup();
    render(<QuickScaffoldWidget />);

    await waitFor(() =>
      expect(screen.getByText("React App")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Backend" }));

    await waitFor(() => {
      expect(screen.getByText("Node API")).toBeInTheDocument();
      expect(screen.queryByText("React App")).not.toBeInTheDocument();
    });
  });

  it("filters templates by title when typing in the search box", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(TEMPLATES))
      .mockResolvedValueOnce(ok(CATEGORIES));

    const user = userEvent.setup();
    render(<QuickScaffoldWidget />);

    await waitFor(() =>
      expect(screen.getByText("React App")).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText(/search templates/i),
      "ML",
    );

    await waitFor(() => {
      expect(screen.getByText("ML Model")).toBeInTheDocument();
      expect(screen.queryByText("React App")).not.toBeInTheDocument();
    });
  });

  it("shows 'No templates match' when search yields no results", async () => {
    mockFetch
      .mockResolvedValueOnce(ok(TEMPLATES))
      .mockResolvedValueOnce(ok(CATEGORIES));

    const user = userEvent.setup();
    render(<QuickScaffoldWidget />);

    await waitFor(() =>
      expect(screen.getByText("React App")).toBeInTheDocument(),
    );

    await user.type(
      screen.getByPlaceholderText(/search templates/i),
      "zzznomatch",
    );

    await waitFor(() =>
      expect(
        screen.getByText(/no templates match your search/i),
      ).toBeInTheDocument(),
    );
  });

  it("renders an error message when the API returns 503", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    render(<QuickScaffoldWidget />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load scaffolder data/i),
      ).toBeInTheDocument(),
    );
  });
});
