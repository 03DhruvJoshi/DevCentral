export interface ProjectResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
}
