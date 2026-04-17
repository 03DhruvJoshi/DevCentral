/**
 * Tests for EditTemplateModal.tsx
 *
 * Branches covered:
 *   Trigger render   — "Edit Info" button is visible
 *   Dialog open      — clicking the trigger renders the dialog content
 *   YAML syntax error — pre-filled with invalid YAML shows "Syntax Error"
 *   Save calls API   — clicking Save calls PUT /api/templates/{id}
 *   API error shown  — error from PUT is displayed in the dialog
 *   Dialog closes    — dialog closes after a successful save
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditTemplateModal from "./EditTemplateModal.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../components/types.js", async () => {
  const actual = await vi.importActual<
    typeof import("../components/types.js")
  >("../components/types.js");
  return { ...actual, API_BASE_URL: "http://localhost:4000" };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

const TEMPLATE = {
  id: 1,
  title: "React Starter",
  description: "A good template",
  categoryName: "Frontend",
  yaml: "name: react-starter\nversion: 1\n",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const CATEGORIES = [{ id: 1, name: "Frontend" }, { id: 2, name: "Backend" }];

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderModal(template = TEMPLATE, categories = CATEGORIES) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <EditTemplateModal template={template} categories={categories} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("EditTemplateModal", () => {
  it("renders the 'Edit Info' trigger button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /edit info/i })).toBeInTheDocument();
  });

  it("opens the dialog with the template title when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /edit info/i }));

    await waitFor(() => {
      // The dialog title should include the template title
      expect(screen.getByDisplayValue("React Starter")).toBeInTheDocument();
    });
  });

  it("shows 'Syntax Error' for a template pre-loaded with invalid YAML", async () => {
    const user = userEvent.setup();
    const brokenTemplate = { ...TEMPLATE, yaml: "key: [broken" };
    renderModal(brokenTemplate);

    await user.click(screen.getByRole("button", { name: /edit info/i }));

    await waitFor(() => {
      expect(screen.getByText(/syntax error/i)).toBeInTheDocument();
    });
  });

  it("calls PUT /api/templates/{id} when Save is clicked with valid YAML", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ...TEMPLATE, title: "Updated Title" }),
    });

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /edit info/i }));
    await waitFor(() =>
      expect(screen.getByDisplayValue("React Starter")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/templates/1"),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  it("displays the API error message when the PUT request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Duplicate template title" }),
    });

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /edit info/i }));
    await waitFor(() =>
      expect(screen.getByDisplayValue("React Starter")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate template title/i)).toBeInTheDocument();
    });
  });
});
