export default interface CICD {
  timeframe_days: number;
  summary: {
    total_runs: number;
    success: number;
    failure: number;
    change_failure_rate: number;
    avg_duration_min: number | null;
    deploy_frequency_per_day: number;
    mttr_min: number | null;
    queue_sla_breach_count?: number;
    long_running_count?: number;
    flaky_commit_count?: number;
  };
  success_rate_over_time: {
    date: string;
    total: number;
    success_rate: number;
  }[];
  flaky_workflows: {
    head_sha: string;
    runs: number;
    workflow?: string;
    url?: string;
  }[];
  slowest_jobs: {
    run_id: number;
    workflow: string;
    branch: string;
    job_name: string;
    status: string | null;
    url: string;
    duration_min: number | null;
  }[];
  queue_vs_execution: {
    avg_queue_min: number | null;
    avg_exec_min: number | null;
    runs: {
      run_id: number;
      workflow: string;
      queue_min: number | null;
      exec_min: number | null;
    }[];
  };
  workflow_breakdown?: {
    workflow: string;
    total_runs: number;
    success_rate: number;
    failure_rate: number;
    avg_duration_min: number | null;
    avg_queue_min: number | null;
    last_run_at: string;
  }[];
  branch_breakdown?: {
    branch: string;
    total_runs: number;
    success_rate: number;
    failure_rate: number;
    avg_duration_min: number | null;
  }[];
  conclusion_breakdown?: {
    conclusion: string;
    count: number;
  }[];
  failure_reasons?: {
    conclusion: string;
    count: number;
  }[];
  run_register?: {
    run_id: number;
    workflow: string;
    branch: string;
    event: string;
    status: string;
    conclusion: string | null;
    actor: string | null;
    queue_min: number | null;
    exec_min: number | null;
    duration_min: number | null;
    created_at: string;
    updated_at: string;
    url: string;
  }[];
}
