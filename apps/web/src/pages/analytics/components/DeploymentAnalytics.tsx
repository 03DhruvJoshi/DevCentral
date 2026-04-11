import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Cloud,
  Filter,
  TrendingDown,
  TrendingUp,
  Minus,
  Settings,
  X,
  Eye,
  EyeOff,
  Link,
  Unlink,
  PlugZap,
  GitBranch,
  Timer,
  BarChart3,
  Activity,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs.js";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { API_BASE_URL, token } from "./types.js";
import type { Repository } from "./types.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(sec: number | null): string {
  if (sec === null || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function formatAbsDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "8px 12px",
};

// ─── Small pieces ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NormalisedDeployment["status"] }) {
  const styles: Record<typeof status, string> = {
    success: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    building: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const icons: Record<typeof status, ReactNode> = {
    success: <CheckCircle2 className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    building: <RefreshCw className="h-3 w-3 animate-spin" />,
    cancelled: <Minus className="h-3 w-3" />,
  };
  return (
    <Badge
      variant="outline"
      className={`${styles[status]} flex items-center gap-1 capitalize text-xs`}
    >
      {icons[status]}
      {status}
    </Badge>
  );
}

function VercelLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 116 100"
      fill="currentColor"
      aria-hidden
    >
      <path d="M57.5 0L115 100H0L57.5 0z" />
    </svg>
  );
}

function RenderLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#46E3B7" aria-hidden>
      <path d="M4.51 0C2.02 0 0 2.02 0 4.51v14.98C0 21.98 2.02 24 4.51 24h14.98C21.98 24 24 21.98 24 19.49V4.51C24 2.02 21.98 0 19.49 0H4.51zm7.49 6.59l5.41 9.41H6.59L12 6.59z" />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: "vercel" | "render" }) {
  return provider === "vercel" ? <VercelLogo /> : <RenderLogo />;
}

// ─── Trend Arrow ────────────────────────────────────────────────────────────────

function TrendIndicator({ pct }: { pct: number | null }) {
  if (pct === null)
    return <span className="text-xs text-muted-foreground">—</span>;
  const up = pct >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

// ─── Connect Modal ──────────────────────────────────────────────────────────────

function ConnectModal({
  provider,
  onClose,
  onSuccess,
}: {
  provider: "vercel" | "render";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiToken, setApiToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVercel = provider === "vercel";

  async function handleConnect() {
    const trimmed = apiToken.trim();
    if (!trimmed) {
      setError("API token is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/integrations/${provider}/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            apiToken: trimmed,
            ...(isVercel && teamId.trim() ? { teamId: teamId.trim() } : {}),
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Connection failed.");
      else onSuccess();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted">
              <ProviderIcon provider={provider} />
            </div>
            <h2 className="font-semibold text-base">
              Connect {isVercel ? "Vercel" : "Render"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {isVercel
            ? "Enter your Vercel API token to pull real deployment metrics. Create one at vercel.com → Account → Tokens."
            : "Enter your Render API key to pull deployment data. Find it at dashboard.render.com → Account Settings → API Keys."}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              API {isVercel ? "Token" : "Key"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => {
                  setApiToken(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                placeholder={isVercel ? "vercel_pat_..." : "rnd_..."}
                autoFocus
                className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {isVercel && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Team slug{" "}
                <span className="font-normal opacity-70">
                  (optional — needed for team deployments)
                </span>
              </label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="my-org"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            onClick={handleConnect}
            disabled={submitting || !apiToken.trim()}
            className="w-full"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Validating…
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect {isVercel ? "Vercel" : "Render"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Card (connected) ──────────────────────────────────────────────────

function ConnectedProviderCard({
  provider,
  stats,
  connectedAt,
  isFiltered,
  onDisconnect,
}: {
  provider: "vercel" | "render";
  stats: ProviderStat | undefined;
  connectedAt: string | null;
  isFiltered: boolean;
  onDisconnect: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  async function handleDisconnect(e: React.MouseEvent) {
    e.stopPropagation();
    setDisconnecting(true);
    try {
      await fetch(`${API_BASE_URL}/api/integrations/${provider}/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDisconnect();
    } catch {
      /* ignore */
    } finally {
      setDisconnecting(false);
    }
  }
  const name = provider === "vercel" ? "Vercel" : "Render";
  const accentColor = provider === "vercel" ? "#374151" : "#46E3B7";
  const sr = stats?.successRate ?? 0;
  const successCls =
    sr >= 95 ? "text-green-600" : sr >= 85 ? "text-yellow-600" : "text-red-600";
  return (
    <Card
      className={`relative overflow-hidden transition-shadow ${isFiltered ? "ring-2 ring-primary shadow-md" : ""}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <ProviderIcon provider={provider} />
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <Badge
                variant="outline"
                className="text-xs mt-0.5 bg-green-50 text-green-700 border-green-200"
              >
                Connected
              </Badge>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            title="Disconnect"
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {disconnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
          </button>
        </div>
        {stats ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className={`text-xl font-bold ${successCls}`}>
                {stats.successRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deploys</p>
              <p className="text-xl font-bold">{stats.totalDeploys}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
              <p className="text-sm font-semibold">
                {stats.avgDurationMin === null
                  ? "—"
                  : `${stats.avgDurationMin} min`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Deploy</p>
              <p className="text-sm font-semibold">
                {stats.lastDeployAt
                  ? formatRelativeTime(stats.lastDeployAt)
                  : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            No deployments found for this repo in the selected period.
            {connectedAt && (
              <span> Connected {formatRelativeTime(connectedAt)}.</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Provider Card (not connected) ─────────────────────────────────────────────

function DisconnectedProviderCard({
  provider,
  onConnect,
}: {
  provider: "vercel" | "render";
  onConnect: () => void;
}) {
  const name = provider === "vercel" ? "Vercel" : "Render";
  const accentColor = provider === "vercel" ? "#374151" : "#46E3B7";
  return (
    <Card
      className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-dashed"
      onClick={onConnect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onConnect()}
      role="button"
      tabIndex={0}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-muted">
            <ProviderIcon provider={provider} />
          </div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <Badge
              variant="outline"
              className="text-xs mt-0.5 text-muted-foreground"
            >
              Not connected
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onConnect();
          }}
        >
          <Link className="h-3.5 w-3.5 mr-1.5" />
          Connect {name}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlaceholderCard({
  name,
  logo,
  description,
  accentClass,
}: {
  name: string;
  logo: ReactNode;
  description: string;
  accentClass: string;
}) {
  return (
    <Card className="relative overflow-hidden opacity-55">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-muted">{logo}</div>
          <div>
            <p className="font-semibold text-sm">{name}</p>
            <Badge variant="outline" className="text-xs mt-0.5">
              Coming Soon
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full text-xs"
          disabled
        >
          <Settings className="h-3 w-3 mr-1" />
          Connect {name}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Deployment Row ─────────────────────────────────────────────────────────────

function DeploymentRow({ dep }: { dep: NormalisedDeployment }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
      <div
        className={`p-1.5 rounded-md shrink-0 ${dep.provider === "vercel" ? "bg-gray-100" : "bg-emerald-50"}`}
      >
        <ProviderIcon provider={dep.provider} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={dep.status} />
          <span
            className="text-xs font-mono text-muted-foreground truncate max-w-[120px]"
            title={dep.branch}
          >
            {dep.branch}
          </span>
          <Badge variant="outline" className="text-xs capitalize">
            {dep.environment}
          </Badge>
        </div>
        {dep.commitMessage && (
          <p
            className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm"
            title={dep.commitMessage}
          >
            {dep.commitMessage}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatAbsDate(dep.startedAt)}
          {dep.commitSha && (
            <span className="font-mono ml-1.5 opacity-60">
              · {dep.commitSha.slice(0, 7)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <p className="text-sm font-medium">{formatDuration(dep.durationSec)}</p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(dep.startedAt)}
        </p>
      </div>
      {dep.url && (
        <a
          href={dep.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 text-muted-foreground hover:text-foreground shrink-0"
          title="Open deployment"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

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
    if (!analyticsData) return [];
    return analyticsData.recentDeployments.filter((d) => {
      if (providerFilter !== "all" && d.provider !== providerFilter)
        return false;
      if (envFilter !== "all" && d.environment !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [analyticsData, providerFilter, envFilter, statusFilter]);

  const filteredFrequency = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.frequencyOverTime.map((d) => ({
      ...d,
      vercel: providerFilter === "render" ? 0 : d.vercel,
      render: providerFilter === "vercel" ? 0 : d.render,
    }));
  }, [analyticsData, providerFilter]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading deployment metrics…</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "no-token") {
    return (
      <Card>
        <CardContent className="h-[300px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="font-medium">Not signed in</p>
          <p className="text-sm">Please log in to view deployment analytics.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardContent className="h-[300px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="text-center">
            <p className="font-medium text-destructive">
              Failed to load deployment data
            </p>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = analyticsData!;

  // ── No integrations ────────────────────────────────────────────────────────
  if (data.noIntegrations) {
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
          <Card className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border-indigo-100">
            <CardContent className="py-12 flex flex-col items-center text-center gap-5">
              <div className="p-4 rounded-full bg-indigo-100">
                <PlugZap className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  No deployment providers connected
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Connect Vercel or Render to see deployment frequency, success
                  rates, build durations, failure analysis, peak activity, and
                  branch-level breakdown for{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepo.name}
                  </span>
                  .
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Button
                  onClick={() => setConnectModal("vercel")}
                  className="gap-2"
                >
                  <VercelLogo className="h-4 w-4" />
                  Connect Vercel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConnectModal("render")}
                  className="gap-2"
                >
                  <RenderLogo className="h-4 w-4" />
                  Connect Render
                </Button>
              </div>
            </CardContent>
          </Card>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Future Integrations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PlaceholderCard
                name="AWS CodeDeploy"
                logo={<Cloud className="h-4 w-4 text-orange-500" />}
                description="CloudWatch, CodePipeline & ECS deployment tracking"
                accentClass="bg-gradient-to-r from-orange-400 to-yellow-400"
              />
              <PlaceholderCard
                name="Google Cloud"
                logo={<Cloud className="h-4 w-4 text-blue-500" />}
                description="Cloud Run, GKE, and Cloud Deploy pipeline visibility"
                accentClass="bg-gradient-to-r from-blue-400 to-cyan-400"
              />
              <PlaceholderCard
                name="Azure DevOps"
                logo={<Cloud className="h-4 w-4 text-blue-600" />}
                description="Azure Pipelines, AKS deployments, and release gates"
                accentClass="bg-gradient-to-r from-blue-600 to-indigo-500"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

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
  const vercelStats = providerStats.find((p) => p.provider === "Vercel");
  const renderStats = providerStats.find((p) => p.provider === "Render");

  const srColor =
    summary.successRate >= 95
      ? "text-green-600"
      : summary.successRate >= 85
        ? "text-yellow-600"
        : "text-red-600";

  const statusDonutData = [
    { name: "Success", value: statusBreakdown.success, color: "#22c55e" },
    { name: "Failed", value: statusBreakdown.failed, color: "#ef4444" },
    { name: "Building", value: statusBreakdown.building, color: "#3b82f6" },
    { name: "Cancelled", value: statusBreakdown.cancelled, color: "#9ca3af" },
  ].filter((s) => s.value > 0);

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
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Rocket className="h-5 w-5 text-indigo-500" />
              Deployment Analytics
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Multi-provider deployment insights for{" "}
              <span className="font-medium text-foreground">
                {selectedRepo.name}
              </span>
              <span className="ml-2 text-xs opacity-60">
                · last {days} days
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            className="gap-1.5 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* ── Filter bar ── */}
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Filters
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    label: "Time range",
                    value: timeRange,
                    onChange: (v: string) => setTimeRange(v as TimeRange),
                    width: "w-[105px]",
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
                    onChange: (v: string) =>
                      setProviderFilter(v as ProviderFilter),
                    width: "w-[115px]",
                    options: [
                      { value: "all", label: "All providers" },
                      { value: "vercel", label: "Vercel only" },
                      { value: "render", label: "Render only" },
                    ],
                  },
                  {
                    label: "Environment",
                    value: envFilter,
                    onChange: (v: string) => setEnvFilter(v as EnvFilter),
                    width: "w-[130px]",
                    options: [
                      { value: "all", label: "All envs" },
                      { value: "production", label: "Production" },
                      { value: "preview", label: "Preview" },
                      { value: "staging", label: "Staging" },
                    ],
                  },
                  {
                    label: "Status",
                    value: statusFilter,
                    onChange: (v: string) => setStatusFilter(v as StatusFilter),
                    width: "w-[115px]",
                    options: [
                      { value: "all", label: "All statuses" },
                      { value: "success", label: "Success" },
                      { value: "failed", label: "Failed" },
                      { value: "building", label: "Building" },
                      { value: "cancelled", label: "Cancelled" },
                    ],
                  },
                ].map(({ label, value, onChange, width, options }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <Select value={value} onValueChange={onChange}>
                      <SelectTrigger className={`h-8 ${width} text-xs`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs ml-auto"
                onClick={() => {
                  setTimeRange("30d");
                  setProviderFilter("all");
                  setEnvFilter("all");
                  setStatusFilter("all");
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI row (6 cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Deployments
                </p>
                <Rocket className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold">{summary.totalDeploys}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs text-muted-foreground">in {days}d</p>
                <TrendIndicator pct={velocityTrend.changePct} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Success Rate
                </p>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className={`text-2xl font-bold ${srColor}`}>
                {summary.successRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusBreakdown.success} passed · {statusBreakdown.failed}{" "}
                failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Avg Build Time
                </p>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatDuration(summary.avgDurationSec)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                across all providers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Deploy Frequency
                </p>
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {summary.deploysPerDay}
                <span className="text-base font-normal">/day</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                avg over period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Failed Deploys
                </p>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {summary.failedDeploys}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalDeploys > 0
                  ? `${(100 - summary.successRate).toFixed(1)}% failure rate`
                  : "no data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  MTTR
                </p>
                <Timer className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {summary.mttrMin === null ? "—" : `${summary.mttrMin}m`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                mean time to recovery
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Provider cards ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Deployment Providers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <PlaceholderCard
              name="AWS CodeDeploy"
              logo={<Cloud className="h-4 w-4 text-orange-500" />}
              description="CloudWatch, CodePipeline & ECS deployment tracking"
              accentClass="bg-gradient-to-r from-orange-400 to-yellow-400"
            />
            <PlaceholderCard
              name="Google Cloud"
              logo={<Cloud className="h-4 w-4 text-blue-500" />}
              description="Cloud Run, GKE, and Cloud Deploy pipeline visibility"
              accentClass="bg-gradient-to-r from-blue-400 to-cyan-400"
            />
            <PlaceholderCard
              name="Azure DevOps"
              logo={<Cloud className="h-4 w-4 text-blue-600" />}
              description="Azure Pipelines, AKS deployments, and release gates"
              accentClass="bg-gradient-to-r from-blue-600 to-indigo-500"
            />
          </div>
        </div>

        {/* ── Charts ── */}
        {summary.totalDeploys > 0 ? (
          <Tabs defaultValue="overview">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 w-auto">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-1.5"
              >
                <Activity className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="duration"
                className="flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Build Times
              </TabsTrigger>
              <TabsTrigger
                value="environments"
                className="flex items-center gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Environments
              </TabsTrigger>
              <TabsTrigger
                value="failures"
                className="flex items-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Failures
              </TabsTrigger>
              <TabsTrigger value="peak" className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Peak Times
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center gap-1.5"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Activity Log
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Overview ── */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Deployment Frequency area chart */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">
                          Deployment Frequency
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Daily deploys per provider. A consistent rhythm
                          signals a healthy shipping culture. Gaps may indicate
                          blocked pipelines or feature-freeze periods.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        {connectedVercel && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-4 rounded-full bg-indigo-500" />
                            Vercel
                          </span>
                        )}
                        {connectedRender && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-4 rounded-full bg-emerald-500" />
                            Render
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={filteredFrequency}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="vGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#6366f1"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#6366f1"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="rGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => v.slice(5)}
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelFormatter={(l) => `Date: ${l}`}
                          formatter={(val, name) => [
                            val,
                            name === "vercel" ? "Vercel" : "Render",
                          ]}
                        />
                        {providerFilter !== "render" && connectedVercel && (
                          <Area
                            type="monotone"
                            dataKey="vercel"
                            name="vercel"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#vGrad)"
                          />
                        )}
                        {providerFilter !== "vercel" && connectedRender && (
                          <Area
                            type="monotone"
                            dataKey="render"
                            name="render"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#rGrad)"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status donut */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Deployment Outcomes
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Breakdown by final status across all providers and
                      environments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px] flex flex-col items-center justify-center">
                    {statusDonutData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDonutData}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusDonutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val, name) => [`${val} deploys`, name]}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No status data.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Velocity comparison cards */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Velocity Trend</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Recent half-period vs earlier half-period deploy rate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Earlier period
                        </p>
                        <p className="text-2xl font-bold">
                          {velocityTrend.older}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          deploys/day
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Recent period
                        </p>
                        <p className="text-2xl font-bold">
                          {velocityTrend.recent}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          deploys/day
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Change:
                        </span>
                        <TrendIndicator pct={velocityTrend.changePct} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {velocityTrend.changePct === null
                          ? "Not enough data to compare periods."
                          : velocityTrend.changePct > 0
                          ? "Deployment velocity is accelerating."
                          : velocityTrend.changePct < 0
                          ? "Deployment velocity has slowed."
                          : "Velocity is stable."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Status breakdown numbers */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Status Summary</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Absolute counts per outcome. Use this alongside success
                      rate to gauge scale of issues.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Successful",
                          count: statusBreakdown.success,
                          cls: "text-green-600 bg-green-50 border-green-200",
                        },
                        {
                          label: "Failed",
                          count: statusBreakdown.failed,
                          cls: "text-red-600 bg-red-50 border-red-200",
                        },
                        {
                          label: "Building",
                          count: statusBreakdown.building,
                          cls: "text-blue-600 bg-blue-50 border-blue-200",
                        },
                        {
                          label: "Cancelled",
                          count: statusBreakdown.cancelled,
                          cls: "text-gray-600 bg-gray-50 border-gray-200",
                        },
                      ].map(({ label, count, cls }) => (
                        <div
                          key={label}
                          className={`rounded-lg border p-3 text-center ${cls}`}
                        >
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs font-medium mt-0.5">{label}</p>
                          <p className="text-xs opacity-70 mt-0.5">
                            {summary.totalDeploys > 0
                              ? `${((count / summary.totalDeploys) * 100).toFixed(1)}%`
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Build Times ── */}
            <TabsContent value="duration">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Build Duration Distribution
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      How long deployments take, bucketed by duration. Most
                      builds should complete within 3 minutes. Builds above 10
                      min may indicate missing caching or heavy install steps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={durationDistribution}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(val, name) => [
                            val,
                            name === "vercel"
                              ? "Vercel deploys"
                              : "Render deploys",
                          ]}
                        />
                        <Legend
                          formatter={(v: string) =>
                            v === "vercel" ? "Vercel" : "Render"
                          }
                          iconType="circle"
                          iconSize={8}
                        />
                        <ReferenceLine
                          x="2–3 min"
                          stroke="#f59e0b"
                          strokeDasharray="4 2"
                          label={{
                            value: "Target",
                            position: "top",
                            fontSize: 11,
                            fill: "#f59e0b",
                          }}
                        />
                        {providerFilter !== "render" && connectedVercel && (
                          <Bar
                            dataKey="vercel"
                            name="vercel"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
                        )}
                        {providerFilter !== "vercel" && connectedRender && (
                          <Bar
                            dataKey="render"
                            name="render"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Slowest Builds</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      The 8 longest-running deployments in this period. Review
                      these commits for heavy deps, large assets, or missing
                      caches.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {longestBuilds.length > 0 ? (
                      <div className="divide-y divide-border">
                        {longestBuilds.map((dep, i) => (
                          <div
                            key={dep.id}
                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                              {i + 1}
                            </span>
                            <div
                              className={`p-1 rounded shrink-0 ${dep.provider === "vercel" ? "bg-gray-100" : "bg-emerald-50"}`}
                            >
                              <ProviderIcon provider={dep.provider} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono truncate text-muted-foreground">
                                {dep.branch}
                              </p>
                              {dep.commitMessage && (
                                <p
                                  className="text-xs truncate max-w-[200px]"
                                  title={dep.commitMessage}
                                >
                                  {dep.commitMessage}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground opacity-70">
                                {formatRelativeTime(dep.startedAt)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-orange-600">
                                {formatDuration(dep.durationSec)}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {dep.environment}
                              </Badge>
                            </div>
                            {dep.url && (
                              <a
                                href={dep.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No completed builds with duration data.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Provider success rate bar */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Provider Success Rate
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Deployment success rate per provider. Target is 90%+.
                      Below 85% warrants investigation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px]">
                    {providerStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={providerStats}
                          layout="vertical"
                          margin={{ top: 5, right: 24, left: 24, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            fontSize={11}
                            tickFormatter={(v: number) => `${v}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="provider"
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                            width={55}
                          />
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val) => [`${val}%`, "Success Rate"]}
                          />
                          <ReferenceLine
                            x={90}
                            stroke="#22c55e"
                            strokeDasharray="4 2"
                            label={{
                              value: "90%",
                              position: "top",
                              fontSize: 10,
                              fill: "#22c55e",
                            }}
                          />
                          <Bar
                            dataKey="successRate"
                            name="Success Rate"
                            radius={[0, 4, 4, 0]}
                          >
                            {providerStats.map((s) => (
                              <Cell
                                key={s.provider}
                                fill={
                                  s.successRate >= 95
                                    ? "#22c55e"
                                    : s.successRate >= 85
                                      ? "#f59e0b"
                                      : "#ef4444"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No provider data.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Environments ── */}
            <TabsContent value="environments">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Deployments by Environment
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Proportion across Production, Preview, and Staging. A high
                      preview ratio suggests thorough pre-release validation
                      before production deploys.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {envBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={envBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {envBreakdown.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val, name) => [`${val} deploys`, name]}
                          />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No environment data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Branch Deployment Activity
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Which branches triggered the most deployments. High
                      activity on feature branches may indicate frequent
                      iteration; low main-branch activity could indicate
                      infrequent releases.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {branchActivity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={branchActivity.slice(0, 8)}
                          layout="vertical"
                          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            fontSize={11}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="branch"
                            axisLine={false}
                            tickLine={false}
                            fontSize={11}
                            width={90}
                            tickFormatter={(v: string) =>
                              v.length > 12 ? v.slice(0, 12) + "…" : v
                            }
                          />
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val, name) => [
                              val,
                              name === "success" ? "Successful" : "Failed",
                            ]}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(v: string) =>
                              v === "success" ? "Successful" : "Failed"
                            }
                          />
                          <Bar
                            dataKey="success"
                            name="success"
                            fill="#22c55e"
                            stackId="a"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="failed"
                            name="failed"
                            fill="#ef4444"
                            stackId="a"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No branch data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Branch detail table */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Branch Deep Dive
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Per-branch breakdown: total deploys, success/failure
                      counts, success rate, and average build time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {branchActivity.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">
                                Branch
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                                Total
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                                Success
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                                Failed
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                                Success Rate
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">
                                Avg Duration
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {branchActivity.map((b) => (
                              <tr
                                key={b.branch}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-2.5 px-4 font-mono text-xs">
                                  {b.branch}
                                </td>
                                <td className="py-2.5 px-4 text-right font-medium">
                                  {b.total}
                                </td>
                                <td className="py-2.5 px-4 text-right text-green-600">
                                  {b.success}
                                </td>
                                <td className="py-2.5 px-4 text-right text-red-600">
                                  {b.failed}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <span
                                    className={
                                      b.successRate >= 95
                                        ? "text-green-600"
                                        : b.successRate >= 85
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                    }
                                  >
                                    {b.successRate}%
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right text-muted-foreground">
                                  {formatDuration(b.avgDurationSec)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No branch data available.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Failures ── */}
            <TabsContent value="failures">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Failure Rate Over Time
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Daily success vs failure counts. Spikes in failures may
                      correlate with specific commits, dependency updates, or
                      infrastructure issues. Cross-reference with the Activity
                      Log for specifics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={failureRateOverTime}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => v.slice(5)}
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          fontSize={11}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(val, name) => [
                            val,
                            name === "success" ? "Successful" : "Failed",
                          ]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v: string) =>
                            v === "success" ? "Successful" : "Failed"
                          }
                        />
                        <Bar
                          dataKey="success"
                          name="success"
                          fill="#22c55e"
                          stackId="s"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="failed"
                          name="failed"
                          fill="#ef4444"
                          stackId="s"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* MTTR details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Mean Time to Recovery (MTTR)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Average time between a failed deployment and the next
                      successful one on the same provider. Lower MTTR indicates
                      your team detects and fixes issues quickly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-4 gap-3">
                      <div
                        className={`text-5xl font-black ${summary.mttrMin === null ? "text-muted-foreground" : summary.mttrMin <= 30 ? "text-green-600" : summary.mttrMin <= 120 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {summary.mttrMin === null ? "—" : `${summary.mttrMin}m`}
                      </div>
                      <p className="text-sm text-muted-foreground text-center max-w-xs">
                        {summary.mttrMin === null
                          ? "No recovery data yet — either no failures occurred or all failures are unresolved."
                          : summary.mttrMin <= 30
                            ? "Excellent recovery time. Your team responds to incidents rapidly."
                            : summary.mttrMin <= 120
                              ? "Moderate recovery time. Consider alerting improvements."
                              : "High recovery time. Review your incident response process."}
                      </p>
                      <div className="grid grid-cols-3 gap-3 w-full text-center mt-2">
                        {[
                          {
                            label: "Target",
                            value: "≤ 30m",
                            cls: "text-green-600",
                          },
                          {
                            label: "Acceptable",
                            value: "≤ 120m",
                            cls: "text-yellow-600",
                          },
                          {
                            label: "At Risk",
                            value: "> 120m",
                            cls: "text-red-600",
                          },
                        ].map(({ label, value, cls }) => (
                          <div
                            key={label}
                            className="rounded-lg bg-muted/40 p-2"
                          >
                            <p className={`text-sm font-bold ${cls}`}>
                              {value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Failed deployments list */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Failed Deployments
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Most recent deployment failures. Check commit messages and
                      branches for patterns.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {failedDeployments.length > 0 ? (
                      <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
                        {failedDeployments.map((dep) => (
                          <div
                            key={dep.id}
                            className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div
                              className={`p-1.5 rounded-md shrink-0 mt-0.5 ${dep.provider === "vercel" ? "bg-gray-100" : "bg-emerald-50"}`}
                            >
                              <ProviderIcon provider={dep.provider} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                                  {dep.branch}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {dep.environment}
                                </Badge>
                              </div>
                              {dep.commitMessage && (
                                <p
                                  className="text-xs mt-0.5 truncate max-w-[220px]"
                                  title={dep.commitMessage}
                                >
                                  {dep.commitMessage}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatAbsDate(dep.startedAt)}
                                {dep.commitSha && (
                                  <span className="font-mono ml-1 opacity-60">
                                    {dep.commitSha.slice(0, 7)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {dep.durationSec !== null && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDuration(dep.durationSec)}
                                </p>
                              )}
                              {dep.url && (
                                <a
                                  href={dep.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground inline-block mt-1"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                        <p className="text-sm font-medium text-foreground">
                          No failures in this period
                        </p>
                        <p className="text-xs">Keep it up!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Peak Times ── */}
            <TabsContent value="peak">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Deployments by Hour (UTC)
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Which UTC hours see the most deployment activity. Use this
                      to schedule maintenance windows, and identify whether
                      deploys are clustered in business hours or off-peak.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {peakHours.some((h) => h.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={peakHours}
                          margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            fontSize={10}
                            tickFormatter={(v: string) => v.slice(0, 2)}
                            interval={2}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            fontSize={11}
                            allowDecimals={false}
                          />
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val) => [val, "Deployments"]}
                          />
                          <Bar
                            dataKey="count"
                            name="Deployments"
                            radius={[3, 3, 0, 0]}
                          >
                            {peakHours.map((entry) => {
                              const max = Math.max(
                                ...peakHours.map((h) => h.count),
                              );
                              const intensity = max > 0 ? entry.count / max : 0;
                              const color =
                                intensity > 0.7
                                  ? "#6366f1"
                                  : intensity > 0.4
                                    ? "#818cf8"
                                    : "#c7d2fe";
                              return <Cell key={entry.hour} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No timing data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Deployments by Day of Week
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Deployment distribution across the week. Friday/weekend
                      spikes may indicate risk. Consider enforcing deploy freeze
                      on Fridays after cutoff times.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[280px]">
                    {weekdayDist.some((d) => d.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={weekdayDist}
                          margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            fontSize={12}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            fontSize={11}
                            allowDecimals={false}
                          />
                          <RechartsTooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(val) => [val, "Deployments"]}
                          />
                          <Bar
                            dataKey="count"
                            name="Deployments"
                            radius={[4, 4, 0, 0]}
                          >
                            {weekdayDist.map((entry) => {
                              const isFriSat =
                                entry.day === "Fri" ||
                                entry.day === "Sat" ||
                                entry.day === "Sun";
                              return (
                                <Cell
                                  key={entry.day}
                                  fill={isFriSat ? "#f59e0b" : "#6366f1"}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No timing data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Peak insights */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Peak Activity Insights
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Derived insights from your deployment timing patterns.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(() => {
                        const busiest = peakHours.reduce(
                          (a, b) => (b.count > a.count ? b : a),
                          peakHours[0] ?? { label: "—", count: 0 },
                        );
                        const busiestDay = weekdayDist.reduce(
                          (a, b) => (b.count > a.count ? b : a),
                          weekdayDist[0] ?? { day: "—", count: 0 },
                        );
                        const weekendCount = weekdayDist
                          .filter((d) => d.day === "Sat" || d.day === "Sun")
                          .reduce((s, d) => s + d.count, 0);
                        const weekendPct =
                          summary.totalDeploys > 0
                            ? +(
                                (weekendCount / summary.totalDeploys) *
                                100
                              ).toFixed(1)
                            : 0;
                        return [
                          {
                            label: "Busiest Hour (UTC)",
                            value: busiest.label ?? "—",
                            sub: `${busiest.count} deploys`,
                          },
                          {
                            label: "Busiest Day",
                            value: busiestDay.day ?? "—",
                            sub: `${busiestDay.count} deploys`,
                          },
                          {
                            label: "Weekend Deploys",
                            value: `${weekendPct}%`,
                            sub: `${weekendCount} of ${summary.totalDeploys}`,
                            warn: weekendPct > 20,
                          },
                        ];
                      })().map(({ label, value, sub, warn }) => (
                        <div
                          key={label}
                          className={`rounded-lg border p-4 ${warn ? "border-yellow-200 bg-yellow-50" : "border-border bg-muted/30"}`}
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {label}
                          </p>
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sub}
                          </p>
                          {warn && (
                            <p className="text-xs text-yellow-700 mt-1 font-medium">
                              ⚠ High weekend activity
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Tab: Activity Log ── */}
            <TabsContent value="activity">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        Deployment Activity Log
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Full deployment history with branch, commit, duration,
                        and environment. Use filters above to narrow down by
                        provider, environment, or status.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {filteredRecent.length} deployment
                      {filteredRecent.length === 1 ? "" : "s"}
                      {providerFilter !== "all" && ` · ${providerFilter}`}
                      {envFilter !== "all" && ` · ${envFilter}`}
                      {statusFilter !== "all" && ` · ${statusFilter}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredRecent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      No deployments match the current filters.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredRecent.map((dep) => (
                        <DeploymentRow key={dep.id} dep={dep} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
              <TrendingDown className="h-8 w-8 opacity-30" />
              <p className="font-medium text-foreground">
                No deployments found for this repository
              </p>
              <p className="text-sm max-w-md">
                Your provider
                {connectedVercel && connectedRender ? "s are" : " is"}{" "}
                connected, but no deployments matched{" "}
                <strong>
                  {selectedRepo.owner}/{selectedRepo.name}
                </strong>{" "}
                in the last {days} days. Make sure the project in Vercel /
                Render references this GitHub repository.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
