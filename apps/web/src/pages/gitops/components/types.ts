interface Repository {
  id: number;
  name: string;
  owner: string; // Needed for API call
  url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: string;
  created_at: string;
  html_url: string;
}

interface Pipeline {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  created_at: string;
  run_number: number;
}

interface Release {
  id: number;
  name: string;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  html_url: string;
}

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

const token = localStorage.getItem("devcentral_token");

export {
  API_BASE_URL,
  token,
  type Repository,
  type PullRequest,
  type Pipeline,
  type Release,
};
