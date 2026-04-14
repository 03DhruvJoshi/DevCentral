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
  sqale_rating?: string;
  sqale_index?: string;
  blocker_violations?: string;
  critical_violations?: string;
  major_violations?: string;
  minor_violations?: string;
  ncloc?: string;
}

type SeverityScope = "all" | "critical" | "delivery";
type ValueMode = "absolute" | "density";
type SortDirection = "asc" | "desc";
type SortableIssueField =
  | "severity"
  | "type"
  | "file"
  | "rule"
  | "message"
  | "line";

type SonarIssue = {
  key: string;
  rule?: string;
  severity?: string;
  type?: string;
  message?: string;
  component?: string;
  line?: number;
  status?: string;
  effort?: string;
  creationDate?: string;
  updateDate?: string;
  tags?: string[];
};

type SonarIssueInsights = {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  topFiles: Array<{ component: string; count: number }>;
  topRules: Array<{ rule: string; count: number }>;
  issues: SonarIssue[];
};

export type {
  SonarMetrics,
  SeverityScope,
  ValueMode,
  SortDirection,
  SortableIssueField,
  SonarIssue,
  SonarIssueInsights,
};
