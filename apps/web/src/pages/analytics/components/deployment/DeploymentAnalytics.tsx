import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  Cloud,
  Filter,
  PlugZap,
  GitBranch,
  Timer,
  BarChart3,
  Activity,
} from "lucide-react";

import { Button } from "../../../../components/ui/button.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs.js";

import { API_BASE_URL, token } from "../types.js";
import type { Repository } from "../types.js";

import ActivityLogTab from "./tabs/ActivityLogTab.js";
import OverviewTab from "./tabs/OverviewTab.js";
import BuildTimesTab from "./tabs/BuildTimesTab.js";
import EnvironmentsTab from "./tabs/EnvironmentsTab.js";
import PeakTimesTab from "./tabs/PeakTimesTab.js";
import FailuresTab from "./tabs/FailuresTab.js";

import {
  ConnectModal,
  ConnectedProviderCard,
  DisconnectedProviderCard,
} from "./ProviderCards.js";

import type {
  IntegrationStatus,
  ProviderFilter,
  EnvFilter,
  StatusFilter,
  DeploymentAnalyticsData,
  TimeRange,
} from "./types.js";

import {
  formatDuration,
  TrendIndicator,
  RenderLogo,
  VercelLogo,
} from "./utilities.js";

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DeploymentAnalytics({
  selectedRepo,
}: {
  selectedRepo: Repository;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [envFilter, setEnvFilter] = useState<EnvFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatus | null>(null);
  const [analyticsData, setAnalyticsData] =
    useState<DeploymentAnalyticsData | null>(null);
  const [status, setStatus] = useState<
    "loading" | "error" | "no-token" | "ready"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectModal, setConnectModal] = useState<"vercel" | "render" | null>(
    null,
  );

  const days =
    timeRange === "7d"
      ? 7
      : timeRange === "14d"
        ? 14
        : timeRange === "30d"
          ? 30
          : 90;

  const loadIntegrationStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/integrations/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIntegrationStatus((await res.json()) as IntegrationStatus);
    } catch {
      /* non-critical */
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      setStatus("no-token");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/analytics/deployments/${selectedRepo.owner}/${selectedRepo.name}?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setAnalyticsData((await res.json()) as DeploymentAnalyticsData);
      setStatus("ready");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, [selectedRepo.owner, selectedRepo.name, days]);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  function handleConnectSuccess() {
    setConnectModal(null);
    loadIntegrationStatus();
    loadAnalytics();
  }
  function handleDisconnect() {
    loadIntegrationStatus();
    loadAnalytics();
  }

  // ── Filtered deployments ───────────────────────────────────────────────────

  const filteredRecent = useMemo(() => {
    const recentDeployments = analyticsData?.recentDeployments ?? [];
    return recentDeployments.filter((d: any) => {
      if (providerFilter !== "all" && d.provider !== providerFilter)
        return false;
      if (envFilter !== "all" && d.environment !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [analyticsData, providerFilter, envFilter, statusFilter]);

  const filteredFrequency = useMemo(() => {
    const frequencyOverTime = analyticsData?.frequencyOverTime ?? [];
    return frequencyOverTime.map((d: any) => ({
      ...d,
      vercel: providerFilter === "render" ? 0 : d.vercel,
      render: providerFilter === "vercel" ? 0 : d.render,
    }));
  }, [analyticsData, providerFilter]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="h-[400px] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-600">
            Loading deployment metrics…
          </p>
        </div>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="h-[300px] flex flex-col items-center justify-center gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="font-semibold text-slate-700">Not signed in</p>
          <p className="text-sm text-slate-500">
            Please log in to view deployment analytics.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="h-[300px] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div className="text-center">
            <p className="font-semibold text-red-600">
              Failed to load deployment data
            </p>
            <p className="text-sm text-slate-500 mt-1">{errorMsg}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            className="border-slate-200"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const data = analyticsData!;

  // ── Full dashboard ─────────────────────────────────────────────────────────
  const summary = data.summary ?? {
    totalDeploys: 0,
    successRate: 0,
    avgDurationSec: null,
    deploysPerDay: 0,
    failedDeploys: 0,
    mttrMin: null,
  };
  const providerStats = data.providerStats ?? [];
  const statusBreakdown = data.statusBreakdown ?? {
    success: 0,
    failed: 0,
    building: 0,
    cancelled: 0,
  };
  const durationDistribution = data.durationDistribution ?? [];
  const envBreakdown = data.envBreakdown ?? [];
  const branchActivity = data.branchActivity ?? [];
  const peakHours = data.peakHours ?? [];
  const weekdayDist = data.weekdayDist ?? [];
  const failureRateOverTime = data.failureRateOverTime ?? [];
  const longestBuilds = data.longestBuilds ?? [];
  const failedDeployments = data.failedDeployments ?? [];
  const velocityTrend = data.velocityTrend ?? {
    recent: 0,
    older: 0,
    changePct: null,
  };

  const connectedVercel =
    data.connectedProviders?.vercel ??
    integrationStatus?.vercel.connected ??
    false;
  const connectedRender =
    data.connectedProviders?.render ??
    integrationStatus?.render.connected ??
    false;
  const noProviderConnected = !connectedVercel && !connectedRender;
  const vercelStats = providerStats.find((p) => p.provider === "Vercel");
  const renderStats = providerStats.find((p) => p.provider === "Render");

  const srColor =
    summary.successRate >= 95
      ? "text-green-600"
      : summary.successRate >= 85
        ? "text-yellow-600"
        : "text-red-600";

  const filterConfig = [
    {
      label: "Period",
      value: timeRange,
      onChange: (v: string) => setTimeRange(v as TimeRange),
      options: [
        { value: "7d", label: "Last 7 days" },
        { value: "14d", label: "Last 14 days" },
        { value: "30d", label: "Last 30 days" },
        { value: "90d", label: "Last 90 days" },
      ],
    },
    {
      label: "Provider",
      value: providerFilter,
      onChange: (v: string) => setProviderFilter(v as ProviderFilter),
      options: [
        { value: "all", label: "All providers" },
        { value: "vercel", label: "Vercel" },
        { value: "render", label: "Render" },
      ],
    },
    {
      label: "Environment",
      value: envFilter,
      onChange: (v: string) => setEnvFilter(v as EnvFilter),
      options: [
        { value: "all", label: "All environments" },
        { value: "production", label: "Production" },
        { value: "preview", label: "Preview" },
        { value: "staging", label: "Staging" },
      ],
    },
    {
      label: "Status",
      value: statusFilter,
      onChange: (v: string) => setStatusFilter(v as StatusFilter),
      options: [
        { value: "all", label: "All statuses" },
        { value: "success", label: "Success" },
        { value: "failed", label: "Failed" },
        { value: "building", label: "Building" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ];

  const tabItems = [
    {
      value: "overview",
      icon: <Activity className="h-3.5 w-3.5" />,
      label: "Overview",
    },
    {
      value: "duration",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Build Times",
    },
    {
      value: "environments",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      label: "Environments",
    },
    {
      value: "failures",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Failures",
    },
    {
      value: "peak",
      icon: <Zap className="h-3.5 w-3.5" />,
      label: "Peak Times",
    },
    {
      value: "activity",
      icon: <GitBranch className="h-3.5 w-3.5" />,
      label: "Activity Log",
    },
  ];

  return (
    <>
      {connectModal && (
        <ConnectModal
          provider={connectModal}
          onClose={() => setConnectModal(null)}
          onSuccess={handleConnectSuccess}
        />
      )}

      <div className="space-y-6">
        {/* ── Page header banner ── */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(99,102,241,0.08),transparent)]" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 ring-1 ring-indigo-500/20 shadow-sm">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Deployment Analytics
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Multi-provider insights for{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedRepo.name}
                  </span>
                  <span className="ml-2 text-slate-400">
                    · last {days} days
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              className="gap-1.5 shrink-0 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── No provider connected banner ── */}
        {noProviderConnected && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <PlugZap className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    No deployment providers connected
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Connect Vercel or Render to populate live deployment
                    metrics. Charts show empty states until connected.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                  onClick={() => setConnectModal("vercel")}
                >
                  <VercelLogo className="h-3.5 w-3.5" />
                  Connect Vercel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                  onClick={() => setConnectModal("render")}
                >
                  <RenderLogo className="h-3.5 w-3.5" />
                  Connect Render
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {filterConfig.map(({ label, value, onChange, options }) => (
              <div key={label} className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500 shrink-0">
                  {label}
                </label>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            onClick={() => {
              setTimeRange("30d");
              setProviderFilter("all");
              setEnvFilter("all");
              setStatusFilter("all");
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Total Deployments */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">
                Total Deployments
              </p>
              <Rocket className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {summary.totalDeploys}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span>in {days}d</span>
              <TrendIndicator pct={velocityTrend.changePct} />
            </div>
          </div>

          {/* Success Rate */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">Success Rate</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className={`text-2xl font-bold ${srColor}`}>
              {summary.successRate}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {statusBreakdown.success} passed · {statusBreakdown.failed} failed
            </p>
          </div>

          {/* Avg Build Time */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">
                Avg Build Time
              </p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatDuration(summary.avgDurationSec)}
            </p>
            <p className="text-xs text-slate-400 mt-1">across all providers</p>
          </div>

          {/* Deploy Frequency */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">
                Deploy Frequency
              </p>
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {summary.deploysPerDay}
              <span className="text-base font-normal">/day</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">avg over period</p>
          </div>

          {/* Failed Deploys */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">
                Failed Deploys
              </p>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {summary.failedDeploys}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {summary.totalDeploys > 0
                ? `${(100 - summary.successRate).toFixed(1)}% failure rate`
                : "no data"}
            </p>
          </div>

          {/* MTTR */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">MTTR</p>
              <Timer className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {summary.mttrMin === null ? "—" : `${summary.mttrMin}m`}
            </p>
            <p className="text-xs text-slate-400 mt-1">mean time to recovery</p>
          </div>
        </div>

        {/* ── Provider cards ── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Deployment Providers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedVercel ? (
              <ConnectedProviderCard
                provider="vercel"
                stats={vercelStats}
                connectedAt={integrationStatus?.vercel.connectedAt ?? null}
                isFiltered={providerFilter === "vercel"}
                onDisconnect={handleDisconnect}
              />
            ) : (
              <DisconnectedProviderCard
                provider="vercel"
                onConnect={() => setConnectModal("vercel")}
              />
            )}
            {connectedRender ? (
              <ConnectedProviderCard
                provider="render"
                stats={renderStats}
                connectedAt={integrationStatus?.render.connectedAt ?? null}
                isFiltered={providerFilter === "render"}
                onDisconnect={handleDisconnect}
              />
            ) : (
              <DisconnectedProviderCard
                provider="render"
                onConnect={() => setConnectModal("render")}
              />
            )}

            <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm flex items-center justify-center text-sm text-slate-500">
              <Cloud className="h-4 w-4 mr-2" />
              AWS CodeDeploy, Google Cloud Deploy, and Azure DevOps integrations
              coming soon.
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1">
            <Cloud className="h-3 w-3" />
            AWS CodeDeploy, Google Cloud Deploy, and Azure DevOps integrations
            coming soon.
          </p>
        </div>

        {/* ── Analytics tabs ── */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {tabItems.map(({ value, icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
              >
                {icon}
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              providerFilter={providerFilter}
              connectedRender={connectedRender}
              connectedVercel={connectedVercel}
              statusBreakdown={statusBreakdown}
              velocityTrend={velocityTrend}
              filteredFrequency={filteredFrequency}
              summary={summary}
            />
          </TabsContent>

          <TabsContent value="duration">
            <BuildTimesTab
              durationDistribution={durationDistribution}
              longestBuilds={longestBuilds}
              providerStats={providerStats}
              connectedRender={connectedRender}
              connectedVercel={connectedVercel}
              providerFilter={providerFilter}
            />
          </TabsContent>

          <TabsContent value="environments">
            <EnvironmentsTab
              envBreakdown={envBreakdown}
              branchActivity={branchActivity}
            />
          </TabsContent>

          <TabsContent value="failures">
            <FailuresTab
              summary={summary}
              failedDeployments={failedDeployments}
              failureRateOverTime={failureRateOverTime}
            />
          </TabsContent>

          <TabsContent value="peak">
            <PeakTimesTab
              summary={summary}
              peakHours={peakHours}
              weekdayDist={weekdayDist}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLogTab
              filteredRecent={filteredRecent}
              providerFilter={providerFilter}
              envFilter={envFilter}
              statusFilter={statusFilter}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
