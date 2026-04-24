/**
 * Tests for TemplateWizard.tsx
 *
 * Branches covered:
 *   Loading state          — spinner shown while categories are loading
 *   Happy path (Step 0)    — category buttons rendered after data loads
 *   Step navigation        — clicking a category advances to Step 1 (framework selection)
 *   Back navigation        — clicking Back on Step 1 returns to Step 0
 *   Framework selection    — clicking a framework advances to Step 2 (configure)
 *   Generate YAML          — clicking Generate YAML fires the API call and calls onGenerate
 *   Error / empty options  — "No configurable options" shown when options list is empty
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplateWizard } from "./TemplateWizard.js";

// ── Mock the fetch helpers used by TanStack Query ─────────────────────────────
vi.mock("../components/types.js", () => ({
  fetchWizardCategories: vi.fn(),
  fetchWizardFrameworks: vi.fn(),
  fetchWizardOptions: vi.fn(),
  generateWizardYaml: vi.fn(),
}));

import {
  fetchWizardCategories,
  fetchWizardFrameworks,
  fetchWizardOptions,
  generateWizardYaml,
} from "../components/types.js";

const mockCategories = vi.mocked(fetchWizardCategories);
const mockFrameworks = vi.mocked(fetchWizardFrameworks);
const mockOptions = vi.mocked(fetchWizardOptions);
const mockGenerateYaml = vi.mocked(generateWizardYaml);

const CATEGORIES = [
  { id: "cat-1", label: "Web Application", description: "Build web apps", icon: "Globe", displayOrder: 1, isActive: true },
];

const FRAMEWORKS = [
  { id: "fw-1", categoryId: "cat-1", label: "React", description: "React SPA", icon: "Globe", badge: null, popularity: "popular" },
];

const OPTIONS = [
  { id: "opt-1", label: "TypeScript", description: "Add TypeScript support", tier: "QUALITY", defaultEnabled: true },
];

// Fresh QueryClient per test to avoid cache bleed-over
function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCategories.mockResolvedValue(CATEGORIES);
  mockFrameworks.mockResolvedValue(FRAMEWORKS);
  mockOptions.mockResolvedValue(OPTIONS);
  mockGenerateYaml.mockResolvedValue("yaml: content");
});

describe("TemplateWizard", () => {
  it("shows a spinner while categories are loading", () => {
    mockCategories.mockReturnValue(new Promise(() => {}));
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders category buttons after data loads", async () => {
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("Web Application")).toBeInTheDocument(),
    );
  });

  it("advances to Step 1 (framework selection) when a category is clicked", async () => {
    const user = userEvent.setup();
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("Web Application")).toBeInTheDocument(),
    );

    await user.click(screen.getByText("Web Application"));

    await waitFor(() =>
      expect(screen.getByText(/choose a framework/i)).toBeInTheDocument(),
    );
  });

  it("returns to Step 0 when Back is clicked on Step 1", async () => {
    const user = userEvent.setup();
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("Web Application")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Web Application"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /back/i }));

    await waitFor(() =>
      expect(screen.getByText(/what are you building/i)).toBeInTheDocument(),
    );
  });

  it("advances to Step 2 (configure) when a framework is clicked", async () => {
    const user = userEvent.setup();
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Web Application"));
    await user.click(screen.getByText("Web Application"));

    await waitFor(() => screen.getByText("React"));
    await user.click(screen.getByText("React"));

    await waitFor(() =>
      expect(screen.getByText(/configure options/i)).toBeInTheDocument(),
    );
  });

  it("calls onGenerate with the YAML string when Generate YAML is clicked", async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<TemplateWizard onGenerate={onGenerate} />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Web Application"));
    await user.click(screen.getByText("Web Application"));

    await waitFor(() => screen.getByText("React"));
    await user.click(screen.getByText("React"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /generate yaml/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /generate yaml/i }));

    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith("yaml: content"));
  });

  it("shows 'No configurable options' when the options list is empty", async () => {
    mockOptions.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<TemplateWizard onGenerate={vi.fn()} />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByText("Web Application"));
    await user.click(screen.getByText("Web Application"));

    await waitFor(() => screen.getByText("React"));
    await user.click(screen.getByText("React"));

    await waitFor(() =>
      expect(
        screen.getByText(/no configurable options for this framework/i),
      ).toBeInTheDocument(),
    );
  });
});
