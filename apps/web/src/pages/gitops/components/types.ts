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

// ===== Phase 3a: Health System Interfaces =====

interface HealthIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  description: string;
  autofixable: boolean;
  fixAction?: string;
}

interface AISuggestion {
  category: "security" | "quality" | "deployment" | "team";
  action: string;
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  autofixable: boolean;
}

interface HealthCheckResult {
  totalScore: number; // 0-100
  healthStatus: "green" | "yellow" | "red";
  securityScore: number; // 0-25
  codeQualityScore: number; // 0-25
  deploymentReadinessScore: number; // 0-25
  teamOwnershipScore: number; // 0-25
  securityIssues: HealthIssue[];
  codeQualityIssues: HealthIssue[];
  deploymentReadinessIssues: HealthIssue[];
  teamOwnershipIssues: HealthIssue[];
  aiSuggestions: AISuggestion[];
}

interface QuickFixAction {
  type: string;
  label: string;
  description: string;
  autofixable: boolean;
  icon: string;
}

interface RepositoryMetadata {
  id: string;
  repositoryName: string;
  owner: string;
  healthScore: number;
  healthStatus: "green" | "yellow" | "red";
  lastHealthCheckAt?: string;
  teamName?: string;
  ownerEmail?: string;
  maintainers?: string[];
  lastDeploymentAt?: string;
  lastDeployedVersion?: string;
  language?: string;
  testCoveragePercent?: number;
}

interface FixActionResult {
  success: boolean;
  actionType: string;
  result: {
    message?: string;
    error?: string;
    details?: Record<string, any>;
  };
}

interface RepositoryEnvironment {
  id: string;
  name: string;
  order: number;
  requiresApproval: boolean;
  approvalMinCount: number;
  healthCheckUrl?: string;
  slackChannel?: string;
  lastDeployedVersion?: string;
  lastDeployedAt?: string;
}

interface Deployment {
  id: string;
  version: string;
  environment: string;
  status: "pending" | "in-progress" | "success" | "failed" | "rolled-back";
  deployedAt: string;
  deployedBy: string;
  riskAssessment?: {
    riskLevel: "low" | "medium" | "high";
    issues: string[];
    warnings: string[];
  };
  healthCheckPassed?: boolean;
  approvalRequired: boolean;
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
  type HealthCheckResult,
  type HealthIssue,
  type AISuggestion,
  type QuickFixAction,
  type RepositoryMetadata,
  type FixActionResult,
  type RepositoryEnvironment,
  type Deployment,
};
