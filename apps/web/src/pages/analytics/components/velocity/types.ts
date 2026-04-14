
// Expanded Interface based on new backend
type RiskLevel = "low" | "medium" | "high";
type RegisterSortField =
  | "number"
  | "state"
  | "risk"
  | "branch"
  | "size"
  | "reviews"
  | "age";
type SortDirection = "asc" | "desc";

type VelocityApiResponse = Omit<Velocity, "review_time"> & {
  review_time?: {
    avg_first_review_h?: number | null;
    avg_merge_h?: number | null;
    prs?: ReviewStat[];
  };
};

type ReviewStat = {
  number: number;
  title: string;
  url: string;
  author: string | null;
  base_branch: string;
  head_branch: string;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  comments: number;
  review_comments: number;
  review_count: number;
  approvals: number;
  created_at: string;
  merged_at: string;
  time_to_first_review_h: number | null;
  time_to_merge_h: number;
};

type RegisterRow = {
  number: number;
  title: string;
  url: string;
  author: string | null;
  state: string;
  is_draft: boolean;
  base_branch: string;
  head_branch: string;
  created_at: string;
  updated_at: string;
  age_days: number;
  additions: number;
  deletions: number;
  total_changes: number;
  changed_files: number;
  commits: number;
  comments: number;
  review_comments: number;
  review_count: number;
  approvals: number;
  time_to_first_review_h: number | null;
  time_to_merge_h: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  stale_days: number;
};

export interface Velocity {
  timeframe_days: number;
  summary?: {
    open_prs: number;
    merged_prs: number;
    closed_unmerged_prs: number;
    review_coverage_pct: number;
    avg_pr_changes: number | null;
    median_first_review_h: number | null;
    median_merge_h: number | null;
  };
  review_time: {
    avg_first_review_h: number | null;
    avg_merge_h: number | null;
    prs?: ReviewStat[];
  };
  throughput: { date: string; count: number }[];
  top_reviewers: { username: string; count: number }[];
  reviewer_approvals?: { username: string; count: number }[];
  pr_size_distribution: Record<string, number>;
  branch_activity?: { branch: string; prs: number }[];
  branch_merge_stats?: {
    branch: string;
    merged_prs: number;
    avg_review_h: number | null;
    avg_merge_h: number | null;
  }[];
  active_branch_load?: { branch: string; open_prs: number }[];
  review_response_buckets?: { label: string; count: number }[];
  lead_time_buckets?: { label: string; count: number }[];
  quality_signals?: {
    unreviewed_merged_count: number;
    high_rework_merged_count: number;
    review_sla_breaches: number;
    long_lived_open_prs: number;
    draft_open_prs: number;
  };
  risk_prs?: RegisterRow[];
  pr_register?: RegisterRow[];
  stale_prs: {
    number: number;
    title: string;
    url: string;
    author?: string | null;
    days_stale: number;
  }[];
  merge_conflicts: {
    number: number;
    title: string;
    url: string;
    author?: string | null;
  }[];
}

export type {
    RiskLevel, 
    RegisterSortField,

    SortDirection,
    VelocityApiResponse,
    ReviewStat,
    RegisterRow
}