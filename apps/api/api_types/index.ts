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
  description: string;
  categoryName: string;
  yaml: string;
}

export interface TemplateResponse {
  id: number;
  title: string;
  description: string;
  categoryName: string;
  yaml: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
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
