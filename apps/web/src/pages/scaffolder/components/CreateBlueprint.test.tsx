/**
 * Tests for CreateBlueprint.tsx
 *
 * Branches covered:
 *   Render             — "Template Metadata" card title visible
 *   Title validation   — submitting with empty title shows a validation message
 *   YAML syntax error  — typing invalid YAML shows "Syntax Error"
 *   Category empty     — clicking "Add Category" with blank name shows an error
 *   Publish success    — valid form submission calls POST /api/templates
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreateBlueprint from "./CreateBlueprint.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../templatewizard/TemplateWizard.js", () => ({
  TemplateWizard: () => <div>TemplateWizard</div>,
}));

vi.mock("../components/types.js", async () => {
  const actual = await vi.importActual<
    typeof import("../components/types.js")
  >("../components/types.js");
  return { ...actual, API_BASE_URL: "http://localhost:4000" };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderComponent(categories = [{ id: 1, name: "Frontend" }]) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <CreateBlueprint categories={categories} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("CreateBlueprint", () => {
  it("renders the Template Metadata card title", () => {
    renderComponent();
    expect(screen.getByText(/template metadata/i)).toBeInTheDocument();
  });

  it("shows a validation message when the title is empty and the form is submitted", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Click the publish button without filling the form
    const publishBtn = screen.getByRole("button", { name: /publish blueprint/i });
    await user.click(publishBtn);

    await waitFor(() => {
      // react-hook-form with zod will show a FormMessage
      expect(
        screen.getByText(/required|must be|title/i),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Syntax Error' when invalid YAML is typed into the editor", async () => {
    const user = userEvent.setup();
    renderComponent();

    const yamlTextarea = screen.getByPlaceholderText(
      /name: my-service/i,
    ) ?? screen.getAllByRole("textbox").at(-1)!;

    // Type deliberately broken YAML (unmatched colon / tab mix)
    await user.type(yamlTextarea as HTMLElement, "key: [broken");

    await waitFor(() => {
      expect(screen.getByText(/syntax error/i)).toBeInTheDocument();
    });
  });

  it("shows 'Category name cannot be empty.' when Add Category is clicked with a blank name", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Open the create-category section
    const toggleBtn = screen.getByRole("button", { name: /\+ new category/i });
    await user.click(toggleBtn);

    // Click "Add Category" without filling the name
    const addBtn = await screen.findByRole("button", { name: /add category/i });
    await user.click(addBtn);

    expect(
      screen.getByText(/category name cannot be empty/i),
    ).toBeInTheDocument();
  });

  it("calls POST /api/templates when a valid form is submitted", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 99,
        title: "My Template",
        description: "",
        categoryName: "Frontend",
        yaml: "name: test\n",
        createdAt: "",
        updatedAt: "",
      }),
    });

    const user = userEvent.setup();
    renderComponent();

    // Fill the form
    await user.type(
      screen.getByPlaceholderText(/next\.js enterprise starter/i),
      "My Template",
    );
    // Choose category
    const catSelect = screen.getByDisplayValue("Select category");
    await user.selectOptions(catSelect, "Frontend");

    // Type valid YAML
    const textboxes = screen.getAllByRole("textbox");
    const yamlArea = textboxes[textboxes.length - 1];
    await user.type(yamlArea, "name: test\n");

    await user.click(screen.getByRole("button", { name: /publish blueprint/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/templates"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
