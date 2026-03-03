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

export type { Template, Category };
export { API_BASE_URL, fetchCategories, fetchTemplates };
