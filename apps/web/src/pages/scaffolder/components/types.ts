const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

interface Template {
  id: number;
  title: string;
  description: string;
  categoryName: string;
  yaml: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
}

type WizardOptionTier = "INFRASTRUCTURE" | "QUALITY" | "SECURITY" | "FEATURES";

interface WizardCatalogCategory {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  accentClass?: string;
  displayOrder: number;
  isActive: boolean;
}

interface WizardFramework {
  id: string;
  categoryId: string;
  label: string;
  description: string;
  badge?: string;
  tags: string[];
  popularity?: string;
  icon?: string;
  accentClass?: string;
  displayOrder: number;
  isActive: boolean;
}

interface WizardOption {
  id: string;
  label: string;
  description: string;
  tier: WizardOptionTier;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  defaultEnabled?: boolean;
}

const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${API_BASE_URL}/api/categories`);
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
};

const fetchTemplates = async (): Promise<Template[]> => {
  const response = await fetch(`${API_BASE_URL}/api/templates`);
  if (!response.ok) {
    throw new Error("Failed to fetch templates");
  }
  return response.json();
};

const fetchWizardCategories = async (): Promise<WizardCatalogCategory[]> => {
  const response = await fetch(`${API_BASE_URL}/api/wizard/categories`);
  if (!response.ok) {
    throw new Error("Failed to fetch wizard categories");
  }
  return response.json();
};

const fetchWizardFrameworks = async (): Promise<WizardFramework[]> => {
  const response = await fetch(`${API_BASE_URL}/api/wizard/frameworks`);
  if (!response.ok) {
    throw new Error("Failed to fetch wizard frameworks");
  }
  return response.json();
};

const fetchWizardOptions = async (
  frameworkId: string,
): Promise<WizardOption[]> => {
  const params = new URLSearchParams({ frameworkId });
  const response = await fetch(
    `${API_BASE_URL}/api/wizard/options?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch wizard options");
  }
  return response.json();
};

const generateWizardYaml = async (
  frameworkId: string,
  optionIds: string[],
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/wizard/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frameworkId, optionIds }),
  });
  if (!response.ok) {
    throw new Error("Failed to generate YAML");
  }
  const data = (await response.json()) as { yaml: string };
  return data.yaml;
};

export type {
  Template,
  Category,
  WizardOptionTier,
  WizardCatalogCategory,
  WizardFramework,
  WizardOption,
};
export {
  API_BASE_URL,
  fetchCategories,
  fetchTemplates,
  fetchWizardCategories,
  fetchWizardFrameworks,
  fetchWizardOptions,
  generateWizardYaml,
};
