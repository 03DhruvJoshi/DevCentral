/**
 * Tests for ScaffolderPage.tsx
 *
 * Branches covered:
 *   Page header       — "Scaffolder Marketplace" heading + tabs rendered
 *   Loading state     — "Loading marketplace..." shown while query in-flight
 *   Template cards    — card titles visible after data loads
 *   Search filter     — typing narrows visible templates
 *   Error state       — "Failed to load templates." shown on query error
 *   Create Blueprint  — switching to the Create Blueprint tab renders the stub
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScaffolderPage } from "./ScaffolderPage.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

// We control fetchTemplates / fetchCategories return values per test
const mockFetchTemplates = vi.fn();
const mockFetchCategories = vi.fn();

vi.mock("./components/types.js", async () => {
  const actual = await vi.importActual<typeof import("./components/types.js")>(
    "./components/types.js",
  );
  return {
    ...actual,
    fetchTemplates: () => mockFetchTemplates(),
    fetchCategories: () => mockFetchCategories(),
  };
});

vi.mock("./components/CreateBlueprint.js", () => ({
  default: () => <div>CreateBlueprint</div>,
}));
vi.mock("./components/RunScaffoldModal.js", () => ({
  default: () => <div>RunScaffoldModal</div>,
}));
vi.mock("./components/EditTemplateModal.js", () => ({
  default: () => <div>EditTemplateModal</div>,
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPage(client = makeClient()) {
  return render(
    <QueryClientProvider client={client}>
      <ScaffolderPage />
    </QueryClientProvider>,
  );
}

// ── Shared fixtures ───────────────────────────────────────────────────────────

const TEMPLATE_A = {
  id: 1,
  title: "React Starter",
  description: "A React starter template",
  categoryName: "Frontend",
  yaml: "name: react-starter\n",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const TEMPLATE_B = {
  id: 2,
  title: "Node API",
  description: "A Node.js API template",
  categoryName: "Backend",
  yaml: "name: node-api\n",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetchTemplates.mockReset();
  mockFetchCategories.mockReset();
  // Default: categories resolve to empty array immediately
  mockFetchCategories.mockResolvedValue([]);
});

describe("ScaffolderPage", () => {
  it("renders the 'Scaffolder Marketplace' heading and both tab triggers", async () => {
    mockFetchTemplates.mockResolvedValue([]);

    renderPage();

    expect(screen.getByText(/scaffolder marketplace/i)).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /marketplace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /create blueprint/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Loading marketplace...' while the templates query is in-flight", () => {
    // Never resolves → stays in loading state
    mockFetchTemplates.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText(/loading marketplace/i)).toBeInTheDocument();
  });

  it("renders template card titles after data loads", async () => {
    mockFetchTemplates.mockResolvedValue([TEMPLATE_A, TEMPLATE_B]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("React Starter")).toBeInTheDocument();
      expect(screen.getByText("Node API")).toBeInTheDocument();
    });
  });

  it("hides non-matching templates when the user types in the search box", async () => {
    mockFetchTemplates.mockResolvedValue([TEMPLATE_A, TEMPLATE_B]);

    const user = userEvent.setup();
    renderPage();

    // Wait for cards to appear
    await waitFor(() =>
      expect(screen.getByText("React Starter")).toBeInTheDocument(),
    );

    const searchInput = screen.getByPlaceholderText(
      /search title, description, or yaml/i,
    );
    await user.type(searchInput, "node");

    await waitFor(() => {
      expect(screen.queryByText("React Starter")).not.toBeInTheDocument();
      expect(screen.getByText("Node API")).toBeInTheDocument();
    });
  });

  it("shows 'Failed to load templates.' when the query errors", async () => {
    mockFetchTemplates.mockRejectedValue(new Error("Network error"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument();
    });
  });

  it("renders the CreateBlueprint stub when the 'Create Blueprint' tab is clicked", async () => {
    mockFetchTemplates.mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /create blueprint/i }));

    await waitFor(() => {
      expect(screen.getByText("CreateBlueprint")).toBeInTheDocument();
    });
  });

  it("integration: supports tab round-trip between Marketplace and Create Blueprint while preserving loaded results", async () => {
    mockFetchTemplates.mockResolvedValue([TEMPLATE_A, TEMPLATE_B]);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("React Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /create blueprint/i }));
    await waitFor(() => {
      expect(screen.getByText("CreateBlueprint")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: /marketplace/i }));
    await waitFor(() => {
      expect(screen.getByText("Node API")).toBeInTheDocument();
    });
  });
});
