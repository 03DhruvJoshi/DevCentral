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
  if (status === "pass") return "bg-green-100 text-green-800";
  if (status === "watch") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function severityBadgeClass(severity: AlertItem["severity"]): string {
  if (severity === "critical") return "bg-red-100 text-red-800";
  if (severity === "high") return "bg-orange-100 text-orange-800";
  return "bg-amber-100 text-amber-800";
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
    return { label: "Low", className: "bg-green-100 text-green-800" };
  }
  if (logsLast24h < 60) {
    return { label: "Moderate", className: "bg-amber-100 text-amber-800" };
  }
  return { label: "High", className: "bg-red-100 text-red-800" };
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Security Control Tower</h2>
          <p className="text-sm text-muted-foreground">
            Policy health, privileged activity, and response priorities for the
            platform.
          </p>
        </div>
        <div className="inline-flex rounded-md border p-1">
          <Button
            size="sm"
            variant={windowHours === 24 ? "default" : "secondary"}
            onClick={() => setWindowHours(24)}
            className="hover:bg-green-100 text-green-800 border-green-200 "
          >
            Last 24h
          </Button>
          <Button
            size="sm"
            variant={windowHours === 168 ? "default" : "secondary"}
            onClick={() => setWindowHours(168)}
            className="hover:bg-green-100 text-green-800 border-green-200"
          >
            Last 7d
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Security Posture Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{computed.postureScore}</div>
            <Badge className="bg-slate-100 text-slate-700">
              {computed.postureLabel}
            </Badge>
            <Progress value={computed.postureScore} className="h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCog className="h-4 w-4" />
              Privileged Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {computed.adminUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {computed.adminRatio}% of {computed.totalUsers} total users
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Privileged Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">
              {computed.privilegedActionsInWindow}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {computed.offHoursPrivilegedCount} off-hours events in selected
              window
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              {computed.alerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {computed.adminPromotions7d} admin promotions in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Activity</CardTitle>
            <CardDescription>
              {as_?.total ?? 0} total log entries &nbsp;|&nbsp;{" "}
              <span className="font-medium">{as_?.last24h ?? 0}</span> in last
              24h &nbsp;|&nbsp;{" "}
              <span className="font-medium">{as_?.last7days ?? 0}</span> in last
              7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Activity level:
              </span>
              <span className={`text-sm font-semibold ${level.color}`}>
                {level.label}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last 24h vs Last 7 days</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Identity Snapshot</CardTitle>
            <CardDescription>
              Fast visibility into account distribution and access pressure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">
                Total accounts
              </span>
              <span className="font-semibold">{computed.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">
                Active accounts
              </span>
              <span className="font-semibold text-blue-700">
                {computed.activeUsers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">
                Suspended accounts
              </span>
              <span className="font-semibold text-red-700">
                {computed.suspendedUsers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-muted-foreground">
                Maintenance mode
              </span>
              <Badge
                className={
                  computed.maintenanceMode
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }
              >
                {computed.maintenanceMode ? "ENABLED" : "DISABLED"}
              </Badge>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onOpenTab?.("directory")}
            >
              <Users className="mr-2 h-4 w-4" />
              Open User Directory
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Actionable Alerts</CardTitle>
          <CardDescription>
            Prioritized findings generated from identity, config, and audit
            telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {computed.alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-4 rounded-md border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={severityBadgeClass(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <p className="text-sm font-semibold">{alert.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {alert.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenTab?.(alert.actionTab)}
              >
                {alert.actionLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2  justify-between">
            <div className="w-72">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Search User
              </Label>
              <div className="min-w-[100px] flex-1 ">
                <Input
                  placeholder="Filter by name or email..."
                  value={signupSearchQuery}
                  onChange={(e) => {
                    setSignupSearchQuery(e.target.value);
                    setSignupPage(1);
                  }}
                />
              </div>
            </div>
            <div className="w-36">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Rows per page
              </Label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={signupRowsPerPage}
                onChange={(e) => {
                  setSignupRowsPerPage(Number(e.target.value));
                  setSignupPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {filteredSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent signups.</p>
          ) : (
            paginatedSignups.map((u, i) => (
              <div
                key={`${u.name ?? "user"}-${signupStartIndex + i}`}
                className="flex items-center gap-3 border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {u.name?.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">
                    {u.name ?? "Unknown"}
                  </p>
                  {u.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              {filteredSignups.length > 0
                ? `${signupStartIndex + 1}-${Math.min(signupStartIndex + signupRowsPerPage, filteredSignups.length)}`
                : "0"}{" "}
              of {filteredSignups.length}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safeSignupPage <= 1}
                onClick={() => setSignupPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
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

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
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
