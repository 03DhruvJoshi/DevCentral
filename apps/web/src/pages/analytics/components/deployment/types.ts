type TimeRange = "7d" | "14d" | "30d" | "90d";
type ProviderFilter = "all" | "vercel" | "render";
type EnvFilter = "all" | "production" | "preview" | "staging";
type StatusFilter = "all" | "success" | "failed" | "building" | "cancelled";

interface IntegrationStatus {
  vercel: {
    connected: boolean;
    connectedAt: string | null;
    teamId: string | null;
  };
  render: {
    connected: boolean;
    connectedAt: string | null;
    teamId: string | null;
  };
}

interface NormalisedDeployment {
  id: string;
  provider: "vercel" | "render";
  environment: "production" | "preview" | "staging";
  status: "success" | "failed" | "building" | "cancelled";
  branch: string;
  commitMessage: string | null;
  commitSha: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  url: string | null;
}

interface ProviderStat {
  provider: string;
  totalDeploys: number;
  successRate: number;
  avgDurationMin: number | null;
  lastDeployAt: string | null;
  color: string;
}

interface BranchActivity {
  branch: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgDurationSec: number | null;
}

interface DeploymentAnalyticsData {
  summary: {
    totalDeploys: number;
    successRate: number;
    avgDurationSec: number | null;
    deploysPerDay: number;
    failedDeploys: number;
    mttrMin: number | null;
  };
  frequencyOverTime: {
    date: string;
    vercel: number;
    render: number;
    total: number;
  }[];
  failureRateOverTime: {
    date: string;
    total: number;
    failed: number;
    success: number;
    failureRate: number;
  }[];
  durationDistribution: { label: string; vercel: number; render: number }[];
  envBreakdown: { name: string; value: number; color: string }[];
  providerStats: ProviderStat[];
  statusBreakdown: {
    success: number;
    failed: number;
    building: number;
    cancelled: number;
  };
  branchActivity: BranchActivity[];
  peakHours: { hour: number; label: string; count: number }[];
  weekdayDist: { day: string; count: number }[];
  failedDeployments: NormalisedDeployment[];
  longestBuilds: NormalisedDeployment[];
  velocityTrend: { recent: number; older: number; changePct: number | null };
  recentDeployments: NormalisedDeployment[];
  connectedProviders: { vercel: boolean; render: boolean };
  noIntegrations?: boolean;
}

export type {
  TimeRange,
  ProviderFilter,
  EnvFilter,
  StatusFilter,
  IntegrationStatus,
  NormalisedDeployment,
  ProviderStat,
  BranchActivity,
  DeploymentAnalyticsData,
};
