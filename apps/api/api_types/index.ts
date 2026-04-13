import { Request } from "express";

export interface ProjectResponse {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
}

export interface CreateTemplateRequest {
  title: string;
  description?: string;
  categoryName: string;
  yaml: string;
}

export interface TemplateResponse {
  id: number;
  title: string;
  description?: string;
  categoryName: string;
  yaml: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    password: string;
    githubUsername?: string;
    role: string;
    dashboardPreferences?: {
      widgets: Array<{
        id: string;
        type: string;
        position: {
          x: number;
          y: number;
          w: number;
          h: number;
        };
      }>;
    };
  };
}

export type WizardOptionTier =
  | "INFRASTRUCTURE"
  | "QUALITY"
  | "SECURITY"
  | "FEATURES";

export interface WizardCatalogCategoryResponse {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  accentClass?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface WizardFrameworkResponse {
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

export interface WizardOptionResponse {
  id: string;
  label: string;
  description: string;
  tier: WizardOptionTier;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  defaultEnabled?: boolean;
}

export interface TemplateRevisionResponse {
  id: string;
  templateId: number;
  frameworkId?: string;
  selectedOptionIds: string[];
  source?: Record<string, unknown>;
  compiledYaml: string;
  version: number;
  isActive: boolean;
  createdBy?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateTemplateRevisionRequest {
  templateId: number;
  frameworkId?: string;
  selectedOptionIds?: string[];
  source?: Record<string, unknown>;
  compiledYaml: string;
  notes?: string;
}
