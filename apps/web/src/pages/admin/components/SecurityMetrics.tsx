import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import { Progress } from "../../../components/ui/progress.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

import { API_BASE_URL } from "../types.js";
import { Label } from "../../../components/ui/label.js";

type AdminTab = "directory" | "logs" | "features" | "broadcast" | "security";

interface SecurityTabProps {
  onOpenTab?: (tab: AdminTab) => void;
}

interface PlatformConfig {
  key: string;
  value: string;
  description?: string | null;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  targetId: string | null;
  details: unknown;
  role: string;
  createdAt: string;
}

interface BasicAnalytics {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalTemplates: number;
  };
  recentSignups: Array<{
    name: string | null;
    email?: string | null;
    createdAt: string;
  }>;
}

interface DetailedAnalytics {
  userStats: {
    total: number;
    active: number;
    suspended: number;
    admins: number;
    devs: number;
  };
  contentStats: {
    templates: number;
    categories: number;
    platformConfigs: number;
  };
  auditStats: {
    total: number;
    last24h: number;
    last7days: number;
  };
}

interface AlertItem {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
  actionLabel: string;
  actionTab: AdminTab;
}

interface PolicyCheck {
  id: string;
  name: string;
  status: "pass" | "watch" | "fail";
  rationale: string;
  actionTab: AdminTab;
}

interface ComputedSecurityData {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  adminRatio: number;
  maintenanceMode: boolean;
  privilegedActionsInWindow: number;
  offHoursPrivilegedCount: number;
  adminPromotions7d: number;
  postureScore: number;
  postureLabel: string;
  alerts: AlertItem[];
  policyChecks: PolicyCheck[];
  recentPrivilegedTimeline: AuditLogEntry[];
}

interface SecurityData {
  suspendedCount: number;
  adminCount: number;
  activeCount: number;
  totalUsers: number;
  privilegedRatio: number;
  recentAdminActions: AuditLogEntry[];
  users: AdminUser[];
  maintenanceMode: boolean;
}

const PRIVILEGED_ACTIONS = new Set([
  "USER_UPDATED",
  "BULK_USER_UPDATE",
  "CONFIG_UPDATED",
  "TEMPLATE_DEPLOYED",
  "TEMPLATE_CREATED",
  "GITOPS_ACTION",
]);

function withAuth(method = "GET", body?: unknown) {
  const token = localStorage.getItem("devcentral_token");
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

function withinHours(dateStr: string, hours: number): boolean {
  const stamp = new Date(dateStr).getTime();
  const now = Date.now();
  return now - stamp <= hours * 60 * 60 * 1000;
}

function isOffHours(dateStr: string): boolean {
  const hour = new Date(dateStr).getHours();
  return hour < 6 || hour >= 20;
}

function parseDetails(details: unknown): Record<string, unknown> | null {
  if (!details) return null;
  if (typeof details === "object" && details !== null) {
    return details as Record<string, unknown>;
  }
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function statusBadgeClass(status: PolicyCheck["status"]): string {
  if (status === "pass") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (status === "watch") return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-rose-100 text-rose-700 border border-rose-200";
}

function severityBadgeClass(severity: AlertItem["severity"]): string {
  if (severity === "critical") return "bg-rose-100 text-rose-700 border border-rose-200";
  if (severity === "high") return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-amber-100 text-amber-700 border border-amber-200";
}

function ratioPolicyStatus(
  value: number,
  passMax: number,
  watchMax: number,
): PolicyCheck["status"] {
  if (value <= passMax) return "pass";
  if (value <= watchMax) return "watch";
  return "fail";
}

function offHoursPolicyStatus(value: number): PolicyCheck["status"] {
  if (value < 3) return "pass";
  if (value < 8) return "watch";
  return "fail";
}

function buildAlerts(input: {
  adminRatio: number;
  offHoursPrivilegedCount: number;
  adminPromotions7d: number;
  maintenanceMode: boolean;
  broadcastMessage: string;
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (input.adminRatio > 20) {
    alerts.push({
      id: "admin-ratio",
      severity: input.adminRatio > 30 ? "critical" : "high",
      title: "Privileged account ratio is elevated",
      description: `${input.adminRatio}% of users currently have admin access.`,
      actionLabel: "Review roles",
      actionTab: "directory",
    });
  }

  if (input.offHoursPrivilegedCount >= 5) {
    alerts.push({
      id: "off-hours-priv",
      severity: "high",
      title: "Off-hours privileged activity spike",
      description: `${input.offHoursPrivilegedCount} privileged actions happened outside 06:00-20:00 in the selected window.`,
      actionLabel: "Inspect logs",
      actionTab: "logs",
    });
  }

  if (input.adminPromotions7d >= 3) {
    alerts.push({
      id: "admin-promotions",
      severity: "medium",
      title: "Multiple recent admin promotions",
      description: `${input.adminPromotions7d} admin promotions detected over the last 7 days.`,
      actionLabel: "Open directory",
      actionTab: "directory",
    });
  }

  if (input.maintenanceMode && input.broadcastMessage.trim().length === 0) {
    alerts.push({
      id: "maintenance-msg",
      severity: "critical",
      title: "Maintenance mode lacks communication message",
      description:
        "Maintenance mode is active but no broadcast message is configured for users.",
      actionLabel: "Fix feature flags",
      actionTab: "features",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "no-major-alerts",
      severity: "medium",
      title: "No major alerts detected",
      description:
        "Telemetry looks stable. Continue periodic review of audit logs and access controls.",
      actionLabel: "Open logs",
      actionTab: "logs",
    });
  }

  return alerts;
}

function buildPolicyChecks(input: {
  adminRatio: number;
  maintenanceMode: boolean;
  broadcastMessage: string;
  suspendedRatio: number;
  offHoursPrivilegedCount: number;
}): PolicyCheck[] {
  const maintenanceReady =
    !input.maintenanceMode || input.broadcastMessage.trim().length > 0;

  return [
    {
      id: "policy-admin-ratio",
      name: "Least privilege coverage",
      status: ratioPolicyStatus(input.adminRatio, 20, 30),
      rationale: `${input.adminRatio}% privileged ratio (target <= 20%).`,
      actionTab: "directory",
    },
    {
      id: "policy-maintenance-comms",
      name: "Maintenance communication",
      status: maintenanceReady ? "pass" : "fail",
      rationale: input.maintenanceMode
        ? "Maintenance is active and requires a broadcast message."
        : "Maintenance mode is disabled.",
      actionTab: "features",
    },
    {
      id: "policy-suspension-rate",
      name: "Suspended account pressure",
      status: ratioPolicyStatus(input.suspendedRatio, 9, 19),
      rationale: `${input.suspendedRatio}% of accounts are currently suspended.`,
      actionTab: "directory",
    },
    {
      id: "policy-privileged-activity",
      name: "Privileged activity anomaly",
      status: offHoursPolicyStatus(input.offHoursPrivilegedCount),
      rationale: `${input.offHoursPrivilegedCount} off-hours privileged events in active window.`,
      actionTab: "logs",
    },
  ];
}

function computeSecurityData(input: {
  detailed: DetailedAnalytics | null;
  users: AdminUser[];
  logs: AuditLogEntry[];
  configs: PlatformConfig[];
  windowHours: 24 | 168;
}): ComputedSecurityData {
  const totalUsers = input.detailed?.userStats.total ?? input.users.length;
  const activeUsers =
    input.detailed?.userStats.active ??
    input.users.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsers =
    input.detailed?.userStats.suspended ??
    input.users.filter((u) => u.status === "SUSPENDED").length;
  const adminUsers =
    input.detailed?.userStats.admins ??
    input.users.filter((u) => u.role === "ADMIN").length;

  const recentLogs = input.logs.filter((l) =>
    withinHours(l.createdAt, input.windowHours),
  );
  const privilegedLogs = recentLogs.filter((l) =>
    PRIVILEGED_ACTIONS.has(l.action),
  );
  const offHoursPrivileged = privilegedLogs.filter((l) =>
    isOffHours(l.createdAt),
  );

  const adminPromotions7d = input.logs.filter((l) => {
    if (!withinHours(l.createdAt, 168)) return false;
    if (!PRIVILEGED_ACTIONS.has(l.action)) return false;
    const details = parseDetails(l.details);
    const role = details?.role;
    if (typeof role === "string" && role === "ADMIN") return true;
    const text = typeof l.details === "string" ? l.details.toUpperCase() : "";
    return text.includes("ADMIN") && text.includes("ROLE");
  }).length;

  const maintenanceMode = input.configs.some(
    (c) => c.key === "MAINTENANCE_MODE" && c.value === "true",
  );
  const broadcastMessage =
    input.configs.find((c) => c.key === "BROADCAST_MESSAGE")?.value ?? "";

  const adminRatio =
    totalUsers > 0 ? Math.round((adminUsers / totalUsers) * 100) : 0;
  const suspendedRatio =
    totalUsers > 0 ? Math.round((suspendedUsers / totalUsers) * 100) : 0;

  const privilegeRisk = Math.min(100, Math.round((adminRatio / 30) * 100));
  const authRisk = Math.min(100, suspendedRatio * 2);
  const configRisk =
    (maintenanceMode ? 35 : 0) +
    (maintenanceMode && broadcastMessage.trim().length === 0 ? 35 : 0);
  const activityRisk = Math.min(
    100,
    privilegedLogs.length + offHoursPrivileged.length * 2,
  );

  const postureScore = Math.max(
    0,
    100 -
      Math.round(
        privilegeRisk * 0.35 +
          authRisk * 0.2 +
          configRisk * 0.2 +
          activityRisk * 0.25,
      ),
  );

  let postureLabel = "Strong";
  if (postureScore < 80) postureLabel = "Watch";
  if (postureScore < 60) postureLabel = "At Risk";

  const alerts = buildAlerts({
    adminRatio,
    offHoursPrivilegedCount: offHoursPrivileged.length,
    adminPromotions7d,
    maintenanceMode,
    broadcastMessage,
  });

  const policyChecks = buildPolicyChecks({
    adminRatio,
    maintenanceMode,
    broadcastMessage,
    suspendedRatio,
    offHoursPrivilegedCount: offHoursPrivileged.length,
  });

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    adminRatio,
    maintenanceMode,
    privilegedActionsInWindow: privilegedLogs.length,
    offHoursPrivilegedCount: offHoursPrivileged.length,
    adminPromotions7d,
    postureScore,
    postureLabel,
    alerts,
    policyChecks,
    recentPrivilegedTimeline: input.logs
      .filter((l) => PRIVILEGED_ACTIONS.has(l.action))
      .slice(0, 12),
  };
}

function riskLevel(logsLast24h: number): { label: string; className: string } {
  if (logsLast24h < 15) {
    return { label: "Low", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
  }
  if (logsLast24h < 60) {
    return { label: "Moderate", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  }
  return { label: "High", className: "bg-rose-100 text-rose-700 border border-rose-200" };
}

function activityLevel(per24h: number): { label: string; color: string } {
  if (per24h < 10) return { label: "Low", color: "text-green-600" };
  if (per24h < 50) return { label: "Moderate", color: "text-yellow-600" };
  return { label: "High", color: "text-red-600" };
}

export default function SecurityTab({ onOpenTab }: Readonly<SecurityTabProps>) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState<24 | 168>(24);
  const [signupSearchQuery, setSignupSearchQuery] = useState("");
  const [signupRowsPerPage, setSignupRowsPerPage] = useState(10);
  const [signupPage, setSignupPage] = useState(1);

  const [detailed, setDetailed] = useState<DetailedAnalytics | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [basic, setBasic] = useState<BasicAnalytics | null>(null);

  useEffect(() => {
    const fetchSecurityData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [basicRes, detailedRes, logsRes, usersRes, configRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/analytics`, withAuth()),
            fetch(`${API_BASE_URL}/api/admin/analytics/detailed`, withAuth()),
            fetch(`${API_BASE_URL}/api/admin/audit-logs?limit=150`, withAuth()),
            fetch(`${API_BASE_URL}/api/admin/users?search=`, withAuth()),
            fetch(`${API_BASE_URL}/api/admin/config`, withAuth()),
          ]);

        const analyticsData: DetailedAnalytics | null = detailedRes.ok
          ? await detailedRes.json()
          : null;
        const basicData: BasicAnalytics | null = basicRes.ok
          ? await basicRes.json()
          : null;
        const logsData = logsRes.ok ? await logsRes.json() : { logs: [] };
        const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
        const configData = configRes.ok ? await configRes.json() : [];

        setBasic(basicData);
        setDetailed(analyticsData);

        setLogs((logsData.logs ?? []) as AuditLogEntry[]);
        setUsers((usersData.users ?? []) as AdminUser[]);
        setConfigs((configData ?? []) as PlatformConfig[]);
      } catch (error) {
        console.error("Failed to load security dashboard", error);
        setErrorMessage("Security telemetry could not be loaded right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSecurityData();
  }, []);

  const computed = useMemo(() => {
    return computeSecurityData({
      detailed,
      users,
      logs,
      configs,
      windowHours,
    });
  }, [configs, detailed, logs, users, windowHours]);

  const as_ = detailed?.auditStats;
  const level = activityLevel(as_?.last24h ?? 0);
  const progressValue =
    as_ && as_.last7days > 0
      ? Math.round((as_.last24h / as_.last7days) * 100)
      : 0;

  const filteredSignups = useMemo(() => {
    const query = signupSearchQuery.trim().toLowerCase();
    const source = basic?.recentSignups ?? [];
    if (!query) return source;

    return source.filter((signup) => {
      const name = (signup.name ?? "").toLowerCase();
      const email = (signup.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [basic?.recentSignups, signupSearchQuery]);

  const signupTotalPages = Math.max(
    1,
    Math.ceil(filteredSignups.length / signupRowsPerPage),
  );
  const safeSignupPage = Math.min(signupPage, signupTotalPages);
  const signupStartIndex = (safeSignupPage - 1) * signupRowsPerPage;
  const paginatedSignups = filteredSignups.slice(
    signupStartIndex,
    signupStartIndex + signupRowsPerPage,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Security Control Tower</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Policy health, privileged activity, and response priorities for the platform.
          </p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 gap-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setWindowHours(24)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              windowHours === 24
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Last 24h
          </button>
          <button
            type="button"
            onClick={() => setWindowHours(168)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              windowHours === 168
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Last 7d
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security Posture Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-slate-900">{computed.postureScore}</div>
            <Badge className={`text-xs font-medium border hover:bg-transparent ${
              computed.postureScore >= 80
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : computed.postureScore >= 60
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-rose-100 text-rose-700 border-rose-200"
            }`}>
              {computed.postureLabel}
            </Badge>
            <Progress value={computed.postureScore} className="h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <UserCog className="h-3.5 w-3.5" />
              Privileged Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {computed.adminUsers}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {computed.adminRatio}% of {computed.totalUsers} total users
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5" />
              Privileged Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">
              {computed.privilegedActionsInWindow}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {computed.offHoursPrivilegedCount} off-hours events in selected window
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700">
              {computed.alerts.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {computed.adminPromotions7d} admin promotions in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 py-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">Audit Activity</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              <span className="font-medium text-slate-600">{as_?.total ?? 0}</span> total entries ·{" "}
              <span className="font-medium text-slate-600">{as_?.last24h ?? 0}</span> in last 24h ·{" "}
              <span className="font-medium text-slate-600">{as_?.last7days ?? 0}</span> in last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Activity level:</span>
              <span className={`text-sm font-semibold ${level.color}`}>
                {level.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Last 24h vs Last 7 days</span>
                <span className="font-medium text-slate-600">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 py-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">Current Identity Snapshot</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Fast visibility into account distribution and access pressure.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Total accounts</span>
                <span className="text-sm font-semibold text-slate-900">{computed.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Active accounts</span>
                <span className="text-sm font-semibold text-emerald-700">{computed.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Suspended accounts</span>
                <span className="text-sm font-semibold text-rose-700">{computed.suspendedUsers}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500">Maintenance mode</span>
                <Badge
                  className={`text-xs font-medium border hover:bg-transparent ${
                    computed.maintenanceMode
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {computed.maintenanceMode ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <div className="px-5 py-3">
                <Button
                  className="w-full h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenTab?.("directory")}
                >
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Open User Directory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Actionable Alerts</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Prioritized findings from identity, config, and audit telemetry.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {computed.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${severityBadgeClass(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {alert.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                  onClick={() => onOpenTab?.(alert.actionTab)}
                >
                  {alert.actionLabel}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-900">Recent Signups</CardTitle>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Search User
              </Label>
              <Input
                placeholder="Filter by name or email..."
                className="h-9 bg-slate-50 border-slate-200 text-sm"
                value={signupSearchQuery}
                onChange={(e) => {
                  setSignupSearchQuery(e.target.value);
                  setSignupPage(1);
                }}
              />
            </div>
            <div className="w-32">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Rows
              </Label>
              <Select
                value={String(signupRowsPerPage)}
                onValueChange={(v) => {
                  setSignupRowsPerPage(Number(v));
                  setSignupPage(1);
                }}
              >
                <SelectTrigger className="h-9 bg-slate-50 border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredSignups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent signups.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {paginatedSignups.map((u, i) => (
                <div
                  key={`${u.name ?? "user"}-${signupStartIndex + i}`}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {u.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 leading-none">
                      {u.name ?? "Unknown"}
                    </p>
                    {u.email && (
                      <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                        {u.email}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-medium text-slate-600">
                {filteredSignups.length > 0
                  ? `${signupStartIndex + 1}–${Math.min(signupStartIndex + signupRowsPerPage, filteredSignups.length)}`
                  : "0"}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-600">{filteredSignups.length}</span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-200 text-slate-600"
                disabled={safeSignupPage <= 1}
                onClick={() => setSignupPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-200 text-slate-600"
                disabled={safeSignupPage >= signupTotalPages}
                onClick={() =>
                  setSignupPage((prev) => Math.min(prev + 1, signupTotalPages))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            This page provides operational risk signals from platform telemetry.
            For critical findings, validate in Audit Logs and execute
            remediation through User Directory and Feature Flags.
          </p>
        </div>
      </div>
    </div>
  );
}
