interface Repository {
  id: number;
  name: string;
  owner: string; // Needed for API call
  url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

interface SonarMetrics {
  alert_status?: string;
  bugs?: string;
  vulnerabilities?: string;
  security_hotspots?: string;
  code_smells?: string;
  coverage?: string;
  duplicated_lines_density?: string;
  security_rating?: string;
  reliability_rating?: string;
}

interface Velocity {
  review_time: {
    avg_first_review_h: number | null;
    avg_merge_h: number | null;
    prs: {
      number: number;
      title: string;
      time_to_first_review_h: number | null;
      time_to_merge_h: number;
    }[];
  };
  pr_size_distribution: {
    XS: number;
    S: number;
    M: number;
    L: number;
    XL: number;
  };
  stale_prs: { number: number; title: string; days_stale: number }[];
  merge_conflicts: { number: number; title: string }[];
}

interface CICD {
  summary: {
    total_runs: number;
    success: number;
    failure: number;
    avg_duration_min: number | null;
    deploy_frequency_per_day: number;
    mttr_min: number | null;
  };
  success_rate_over_time: {
    date: string;
    success: number;
    failure: number;
    total: number;
    success_rate: number;
  }[];
  flaky_workflows: { head_sha: string; runs: number; workflow: string }[];
  slowest_jobs: {
    run_id: number;
    job_name: string;
    status: string;
    duration_min: number | null;
  }[];
  queue_vs_execution: {
    avg_queue_min: number | null;
    avg_exec_min: number | null;
    runs: {
      run_id: number;
      workflow: string;
      queue_min: number;
      exec_min: number;
    }[];
  };
  deploy_days: number;
}

const token = localStorage.getItem("devcentral_token");

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type { Repository, SonarMetrics, Velocity, CICD };
export { API_BASE_URL, token };
