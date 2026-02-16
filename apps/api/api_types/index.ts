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
