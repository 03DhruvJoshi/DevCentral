import { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Loader2,
  ShieldCheck,
  Bug,
  AlertTriangle,
  Code,
  SlidersHorizontal,
  FileCode2,
  Search,
  Activity,
  Clock,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs.js";
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "./types.js";
import type { Repository } from "./types.js";

// Expanded Type based on new backend metrics
export interface SonarMetrics {
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

const getRatingLetter = (val?: string) => {
  const map: Record<string, string> = {
    "1.0": "A",
    "2.0": "B",
    "3.0": "C",
    "4.0": "D",
    "5.0": "E",
  };
  return val && map[val] ? map[val] : "N/A";
};

const getRatingColor = (letter: string) => {
  if (letter === "A")
    return "text-emerald-500 bg-emerald-50 border-emerald-200";
  if (letter === "B" || letter === "C")
    return "text-amber-500 bg-amber-50 border-amber-200";
  return "text-rose-500 bg-rose-50 border-rose-200";
};

// Converts SonarQube "sqale_index" (minutes of debt) into human readable time
const formatTechDebt = (minutesStr?: string) => {
  const mins = Number.parseInt(minutesStr || "0", 10);
  if (mins === 0) return "0h";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 8); // Sonar assumes 8h work days
  if (days > 0) return `${days}d ${hours % 8}h`;
  return `${hours}h`;
};

const toNumber = (value?: string) => {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));

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

const getSeverityBadgeClass = (severity?: string) => {
  if (severity === "BLOCKER") {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }
  if (severity === "CRITICAL") {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }
  if (severity === "MAJOR") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (severity === "MINOR") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getIssueTypeBadgeClass = (type?: string) => {
  if (type === "VULNERABILITY") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (type === "BUG") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (type === "SECURITY_HOTSPOT") {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const getFileNameFromComponent = (component?: string) => {
  if (!component) return "unknown";
  const componentParts = component.split(":");
  const pathPart = componentParts.at(-1) ?? component;
  const pathSegments = pathPart.split("/");
  return pathSegments.at(-1) ?? pathPart;
};

export default function SecurityAnalytics({
  selectedRepo,
}: {
  readonly selectedRepo: Repository;
}) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SonarMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [severityScope, setSeverityScope] = useState<SeverityScope>("all");
  const [valueMode, setValueMode] = useState<ValueMode>("absolute");
  const [hideZeroSeries, setHideZeroSeries] = useState(true);
  const [issueInsights, setIssueInsights] = useState<SonarIssueInsights | null>(
    null,
  );
  const [isIssuesLoading, setIsIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [topFilesPage, setTopFilesPage] = useState(1);
  const [topRulesPage, setTopRulesPage] = useState(1);
  const [issuePage, setIssuePage] = useState(1);
  const [issueSeverityFilter, setIssueSeverityFilter] = useState("all");
  const [issueTypeFilter, setIssueTypeFilter] = useState("all");
  const [issueSearch, setIssueSearch] = useState("");
  const [sortField, setSortField] = useState<SortableIssueField>("severity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    if (!selectedRepo) return;
    const token = localStorage.getItem("devcentral_token"); // Ensure fresh token fetch

    async function fetchSonarMetrics() {
      setIsLoading(true);
      setError(null);
      setMetrics(null);
      try {
        if (!token) return navigate("/login", { replace: true });

        setIsIssuesLoading(true);
        setIssuesError(null);
        setIssueInsights(null);

        const [metricsRes, issuesRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/analytics/sonar/${selectedRepo.owner}/${selectedRepo.name}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(
            `${API_BASE_URL}/api/analytics/sonar/${selectedRepo.owner}/${selectedRepo.name}/issues`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
        ]);

        if (!metricsRes.ok) {
          if (metricsRes.status === 404)
            throw new Error("Repository not analyzed by SonarQube yet.");
          throw new Error("Failed to fetch SonarQube data.");
        }
        setMetrics(await metricsRes.json());

        if (issuesRes.ok) {
          setIssueInsights((await issuesRes.json()) as SonarIssueInsights);
          setTopFilesPage(1);
          setTopRulesPage(1);
          setIssuePage(1);
        } else {
          setIssuesError(
            "Issue-level deep dive data is unavailable right now.",
          );
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsIssuesLoading(false);
      }
    }
    fetchSonarMetrics();
  }, [navigate, selectedRepo]);

  const vulnerabilities = toNumber(metrics?.vulnerabilities);
  const bugs = toNumber(metrics?.bugs);
  const securityHotspots = toNumber(metrics?.security_hotspots);

  const duplicatedLinesDensity = toNumber(metrics?.duplicated_lines_density);
  const blockerViolations = toNumber(metrics?.blocker_violations);
  const criticalViolations = toNumber(metrics?.critical_violations);
  const majorViolations = toNumber(metrics?.major_violations);
  const minorViolations = toNumber(metrics?.minor_violations);
  const ncloc = toNumber(metrics?.ncloc);
  const coverageValue = clampPercent(toNumber(metrics?.coverage));

  const totalSeverityIssues =
    blockerViolations + criticalViolations + majorViolations + minorViolations;

  const coverageData = [
    {
      name: "Covered",
      value: coverageValue,
      fill: coverageValue >= 80 ? "#10b981" : "#f59e0b",
    },
    { name: "Uncovered", value: 100 - coverageValue, fill: "#f1f5f9" },
  ];

  const deepDiveIssues = issueInsights?.issues ?? [];
  const topFiles = issueInsights?.topFiles ?? [];
  const topRules = issueInsights?.topRules ?? [];
  const bySeverity = issueInsights?.bySeverity ?? {};
  const byType = issueInsights?.byType ?? {};

  const blockerCount = bySeverity.BLOCKER ?? 0;
  const criticalCount = bySeverity.CRITICAL ?? 0;
  const majorCount = bySeverity.MAJOR ?? 0;
  const minorCount = bySeverity.MINOR ?? 0;

  const vulnerabilityTypeCount = byType.VULNERABILITY ?? 0;
  const bugTypeCount = byType.BUG ?? 0;
  const hotspotTypeCount = byType.SECURITY_HOTSPOT ?? 0;
  const codeSmellTypeCount = byType.CODE_SMELL ?? 0;

  const ITEMS_PER_TOP_CARD_PAGE = 5;
  const ITEMS_PER_TOP_RULE_PAGE = 6;
  const ISSUE_ROWS_PER_PAGE = 12;

  const topFilesTotalPages = Math.max(
    1,
    Math.ceil(topFiles.length / ITEMS_PER_TOP_CARD_PAGE),
  );
  const topRulesTotalPages = Math.max(
    1,
    Math.ceil(topRules.length / ITEMS_PER_TOP_RULE_PAGE),
  );

  const paginatedTopFiles = topFiles.slice(
    (topFilesPage - 1) * ITEMS_PER_TOP_CARD_PAGE,
    topFilesPage * ITEMS_PER_TOP_CARD_PAGE,
  );

  const paginatedTopRules = topRules.slice(
    (topRulesPage - 1) * ITEMS_PER_TOP_RULE_PAGE,
    topRulesPage * ITEMS_PER_TOP_RULE_PAGE,
  );

  const severityRank: Record<string, number> = {
    BLOCKER: 5,
    CRITICAL: 4,
    MAJOR: 3,
    MINOR: 2,
    INFO: 1,
    UNKNOWN: 0,
  };

  const filteredAndSortedIssues = useMemo(() => {
    const normalizedSearch = issueSearch.trim().toLowerCase();

    const filtered = deepDiveIssues.filter((issue) => {
      const severityMatch =
        issueSeverityFilter === "all" ||
        (issue.severity ?? "UNKNOWN") === issueSeverityFilter;
      const typeMatch =
        issueTypeFilter === "all" ||
        (issue.type ?? "UNKNOWN") === issueTypeFilter;

      if (!severityMatch || !typeMatch) return false;
      if (!normalizedSearch) return true;

      const file = getFileNameFromComponent(issue.component).toLowerCase();
      const searchable = [
        issue.severity ?? "",
        issue.type ?? "",
        file,
        issue.rule ?? "",
        issue.message ?? "",
        issue.line ? String(issue.line) : "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;

      if (sortField === "severity") {
        result =
          (severityRank[a.severity ?? "UNKNOWN"] ?? 0) -
          (severityRank[b.severity ?? "UNKNOWN"] ?? 0);
      } else if (sortField === "type") {
        result = (a.type ?? "").localeCompare(b.type ?? "");
      } else if (sortField === "file") {
        result = getFileNameFromComponent(a.component).localeCompare(
          getFileNameFromComponent(b.component),
        );
      } else if (sortField === "rule") {
        result = (a.rule ?? "").localeCompare(b.rule ?? "");
      } else if (sortField === "message") {
        result = (a.message ?? "").localeCompare(b.message ?? "");
      } else if (sortField === "line") {
        result = (a.line ?? -1) - (b.line ?? -1);
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [
    deepDiveIssues,
    issueSearch,
    issueSeverityFilter,
    issueTypeFilter,
    sortField,
    sortDirection,
  ]);

  const totalIssuePages = Math.max(
    1,
    Math.ceil(filteredAndSortedIssues.length / ISSUE_ROWS_PER_PAGE),
  );

  const paginatedIssues = filteredAndSortedIssues.slice(
    (issuePage - 1) * ISSUE_ROWS_PER_PAGE,
    issuePage * ISSUE_ROWS_PER_PAGE,
  );

  const toggleSort = (field: SortableIssueField) => {
    setIssuePage(1);
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("desc");
  };

  const sortIcon = (field: SortableIssueField) => {
    if (sortField !== field)
      return <ChevronDown className="h-3.5 w-3.5 text-slate-300" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
    );
  };

  const weightedIssuePressure =
    blockerViolations * 4 +
    criticalViolations * 3 +
    majorViolations * 2 +
    minorViolations;
  const coveragePenalty = Math.max(0, 80 - coverageValue);
  const duplicationPenalty = Math.max(0, duplicatedLinesDensity - 5) * 2;
  const riskIndex = Math.round(
    weightedIssuePressure +
      coveragePenalty +
      duplicationPenalty +
      vulnerabilities * 4 +
      bugs * 3,
  );

  let riskLevel: "High" | "Moderate" | "Low" = "Low";
  if (riskIndex >= 120) {
    riskLevel = "High";
  } else if (riskIndex >= 50) {
    riskLevel = "Moderate";
  }

  let riskBadgeClass = "border-emerald-200 bg-emerald-50 text-emerald-600";
  if (riskLevel === "High") {
    riskBadgeClass = "border-rose-200 bg-rose-50 text-rose-600";
  } else if (riskLevel === "Moderate") {
    riskBadgeClass = "border-amber-200 bg-amber-50 text-amber-600";
  }

  let riskSnapshotText =
    "Low risk posture. Maintain momentum by addressing remaining hotspots and preventing regression through CI quality gates.";
  if (riskLevel === "High") {
    riskSnapshotText =
      "High aggregate risk. Prioritize blocker and critical violations, then close vulnerability and bug backlog before release.";
  } else if (riskLevel === "Moderate") {
    riskSnapshotText =
      "Moderate risk posture. Focus on high-severity fixes and improve coverage to reduce release uncertainty.";
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-slate-50/50 rounded-t-xl">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldAlert className="h-6 w-6 text-indigo-600" />
              Static Application Security Testing (SAST)
            </CardTitle>
            <CardDescription className="mt-1.5">
              Continuous code inspection for{" "}
              <strong>{selectedRepo.name}</strong> powered by SonarQube.
            </CardDescription>
          </div>

          {metrics && (
            <div className="w-[300px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="deepdive">Deep Dive</TabsTrigger>
              </TabsList>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
              <p className="font-medium text-slate-700">
                Analyzing static code metrics...
              </p>
              <p className="text-sm">
                Fetching historical data from SonarCloud
              </p>
            </div>
          ) : error ? (
            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">{error}</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Ensure the repository exists, is connected to your GitHub app,
                and has completed a SonarCloud pipeline run.
              </p>
            </div>
          ) : metrics ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* --- TAB CONTENT: OVERVIEW --- */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* --- ROW 1: THE EXECUTIVE SUMMARY KPI CARDS --- */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Quality Gate */}
                  <Card
                    className={
                      metrics.alert_status === "OK"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-rose-200 bg-rose-50/30"
                    }
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                          Quality Gate
                        </p>
                        {metrics.alert_status === "OK" ? (
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <AlertOctagon className="h-5 w-5 text-rose-600" />
                        )}
                      </div>
                      <h3
                        className={`text-3xl font-black tracking-tight ${metrics.alert_status === "OK" ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {metrics.alert_status === "OK" ? "PASSED" : "FAILED"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2">
                        Overall release readiness
                      </p>
                    </CardContent>
                  </Card>

                  {/* Security */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-600">
                          Security
                        </p>
                        <AlertTriangle className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-slate-800">
                            {metrics.vulnerabilities || "0"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Open Vulnerabilities
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.security_rating))}`}
                        >
                          {getRatingLetter(metrics.security_rating)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reliability */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-600">
                          Reliability
                        </p>
                        <Bug className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-slate-800">
                            {metrics.bugs || "0"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Identified Bugs
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.reliability_rating))}`}
                        >
                          {getRatingLetter(metrics.reliability_rating)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Maintainability (New) */}
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-600">
                          Maintainability
                        </p>
                        <Activity className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-slate-800">
                            {metrics.code_smells || "0"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Code Smells
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.sqale_rating))}`}
                        >
                          {getRatingLetter(metrics.sqale_rating)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* --- ROW 2: SUPPORTING METRICS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-slate-200 bg-slate-50/60">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Security Hotspots
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {securityHotspots}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Areas requiring manual security review.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-slate-50/60">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total Violations
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {totalSeverityIssues}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sum of blocker, critical, major and minor issues.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-slate-50/60">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Lines Of Code
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {ncloc.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for normalized density analysis.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-slate-50/60">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Composite Risk Index
                      </p>
                      <div className="flex items-end justify-between mt-2">
                        <p className="text-2xl font-black text-slate-800">
                          {riskIndex}
                        </p>
                        <Badge variant="outline" className={riskBadgeClass}>
                          {riskLevel}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* --- TAB CONTENT: DEEP DIVE --- */}
              <TabsContent value="deepdive" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Open Issue Inventory
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {issueInsights?.total ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Live unresolved issues from Sonar issue API.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Critical Surface
                      </p>
                      <p className="text-2xl font-black text-rose-700 mt-2">
                        {blockerCount + criticalCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        BLOCKER + CRITICAL requiring immediate remediation.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Vulnerability Stack
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {vulnerabilityTypeCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Security vulnerabilities currently unresolved.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hotspot Backlog
                      </p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {hotspotTypeCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Security hotspots pending manual review.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-slate-200 bg-slate-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
                      Analysis Filters
                    </CardTitle>
                    <CardDescription>
                      Customize issue visibility and switch between absolute
                      counts and density.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Severity Scope
                      </span>
                      <select
                        value={severityScope}
                        onChange={(e) =>
                          setSeverityScope(e.target.value as SeverityScope)
                        }
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="all">All severity levels</option>
                        <option value="critical">
                          Critical path (blocker + critical)
                        </option>
                        <option value="delivery">
                          Delivery impact (major + minor)
                        </option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Display Mode
                      </span>
                      <select
                        value={valueMode}
                        onChange={(e) =>
                          setValueMode(e.target.value as ValueMode)
                        }
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="absolute">Absolute issue count</option>
                        <option value="density">
                          Issue density per 1k LOC
                        </option>
                      </select>
                    </label>

                    <div className="h-full flex items-end">
                      <label
                        htmlFor="hide-zero-series"
                        className="flex items-center gap-2 h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 w-full"
                      >
                        <input
                          id="hide-zero-series"
                          type="checkbox"
                          checked={hideZeroSeries}
                          onChange={(e) => setHideZeroSeries(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        <span>Hide zero-value categories</span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Tech Debt Card */}
                  <Card className="border-slate-200 bg-slate-50/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" /> Technical
                        Debt
                      </CardTitle>
                      <CardDescription>
                        Estimated effort to fix all code issues.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-6">
                        <span className="text-5xl font-black text-slate-800 tracking-tighter">
                          {formatTechDebt(metrics.sqale_index)}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground mt-2 bg-white px-3 py-1 rounded-full border">
                          {metrics.sqale_index} total minutes
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Duplication Density */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Code className="h-5 w-5 text-slate-500" /> Code
                        Duplication
                      </CardTitle>
                      <CardDescription>
                        Density of copy-pasted blocks and maintainability drag.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                      <span className="text-5xl font-black text-slate-800 tracking-tighter">
                        {duplicatedLinesDensity}%
                      </span>
                      <div className="w-full bg-slate-100 h-3 rounded-full mt-6 overflow-hidden">
                        <div
                          className={`h-full ${duplicatedLinesDensity > 5 ? "bg-rose-500" : "bg-emerald-500"}`}
                          style={{
                            width: `${Math.min(duplicatedLinesDensity, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        {duplicatedLinesDensity > 5
                          ? "Above recommended threshold (5%)."
                          : "Within recommended threshold (<= 5%)."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Test Coverage Donut */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Unit Test Coverage
                      </CardTitle>
                      <CardDescription>
                        Percentage of code hit by CI tests.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[200px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={coverageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          />
                          <RechartsTooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                        <span className="text-3xl font-black text-slate-800">
                          {coverageValue}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Issue Type Matrix
                      </CardTitle>
                      <CardDescription>
                        Exact unresolved issue counts by semantic type and
                        severity.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid   lg:grid-cols-2 gap-4">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Vulnerabilities
                        </p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {vulnerabilityTypeCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">Bugs</p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {bugTypeCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Security Hotspots
                        </p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {securityHotspots}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Code Smells
                        </p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {codeSmellTypeCount}
                        </p>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs text-muted-foreground">Blocker</p>
                        <p className="text-xl font-black text-rose-700 mt-1">
                          {blockerCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs text-muted-foreground">
                          Critical
                        </p>
                        <p className="text-xl font-black text-orange-700 mt-1">
                          {criticalCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs text-muted-foreground">Major</p>
                        <p className="text-xl font-black text-amber-700 mt-1">
                          {majorCount}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs text-muted-foreground">Minor</p>
                        <p className="text-xl font-black text-blue-700 mt-1">
                          {minorCount}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileCode2 className="h-5 w-5 text-sky-600" />
                        Analyzer Commentary
                      </CardTitle>
                      <CardDescription>
                        Contextual summary generated from current repository
                        metrics.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-700">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold text-slate-800">
                          Risk Snapshot
                        </p>
                        <p className="mt-1">{riskSnapshotText}</p>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="font-semibold text-slate-800">
                          Coverage And Duplication
                        </p>
                        <p className="mt-1">
                          Coverage is <strong>{coverageValue}%</strong> and
                          duplication is{" "}
                          <strong>{duplicatedLinesDensity}%</strong>.{" "}
                          {coverageValue < 80
                            ? "Increase test depth in critical modules to reduce delivery risk."
                            : "Coverage is healthy; focus now on reducing remaining defect classes."}
                        </p>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="font-semibold text-slate-800">
                          Priority Queue
                        </p>
                        <ul className="mt-1 space-y-1 text-slate-700">
                          <li>
                            1. Resolve blocker and critical violations first.
                          </li>
                          <li>
                            2. Triage vulnerabilities and bugs by affected
                            components.
                          </li>
                          <li>
                            3. Address hotspots and technical debt for long-term
                            stability.
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Top Affected Files
                      </CardTitle>
                      <CardDescription>
                        Files with the highest unresolved issue concentration.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No file-level issue data available.
                        </p>
                      ) : (
                        paginatedTopFiles.map((file) => (
                          <div
                            key={file.component}
                            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {getFileNameFromComponent(file.component)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {file.component}
                              </p>
                            </div>
                            <Badge variant="outline" className="ml-3">
                              {file.count}
                            </Badge>
                          </div>
                        ))
                      )}

                      {topFiles.length > ITEMS_PER_TOP_CARD_PAGE && (
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            disabled={topFilesPage === 1}
                            onClick={() =>
                              setTopFilesPage((p) => Math.max(1, p - 1))
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-muted-foreground">
                            Page {topFilesPage} of {topFilesTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={topFilesPage === topFilesTotalPages}
                            onClick={() =>
                              setTopFilesPage((p) =>
                                Math.min(topFilesTotalPages, p + 1),
                              )
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">
                        Top Violated Rules
                      </CardTitle>
                      <CardDescription>
                        Most frequently triggered Sonar rules in current
                        backlog.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No rule-level issue data available.
                        </p>
                      ) : (
                        paginatedTopRules.map((rule) => (
                          <div
                            key={rule.rule}
                            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-slate-800 truncate pr-3">
                              {rule.rule}
                            </p>
                            <Badge variant="outline">{rule.count}</Badge>
                          </div>
                        ))
                      )}

                      {topRules.length > ITEMS_PER_TOP_CARD_PAGE && (
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            disabled={topRulesPage === 1}
                            onClick={() =>
                              setTopRulesPage((p) => Math.max(1, p - 1))
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-muted-foreground">
                            Page {topRulesPage} of {topRulesTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={topRulesPage === topRulesTotalPages}
                            onClick={() =>
                              setTopRulesPage((p) =>
                                Math.min(topRulesTotalPages, p + 1),
                              )
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Open Issue Register
                    </CardTitle>
                    <CardDescription>
                      Issue-level list for triage with severity, type, file,
                      rule and message.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={issueSeverityFilter}
                        onChange={(e) => {
                          setIssueSeverityFilter(e.target.value);
                          setIssuePage(1);
                        }}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="all">All Severities</option>
                        <option value="BLOCKER">Blocker</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="MAJOR">Major</option>
                        <option value="MINOR">Minor</option>
                        <option value="INFO">Info</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>

                      <select
                        value={issueTypeFilter}
                        onChange={(e) => {
                          setIssueTypeFilter(e.target.value);
                          setIssuePage(1);
                        }}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="all">All Types</option>
                        <option value="VULNERABILITY">Vulnerability</option>
                        <option value="BUG">Bug</option>
                        <option value="SECURITY_HOTSPOT">
                          Security Hotspot
                        </option>
                        <option value="CODE_SMELL">Code Smell</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>

                      <input
                        type="text"
                        value={issueSearch}
                        onChange={(e) => {
                          setIssueSearch(e.target.value);
                          setIssuePage(1);
                        }}
                        placeholder="Search file, rule, message..."
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      />
                    </div>

                    {isIssuesLoading ? (
                      <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading issue-level insights...
                      </div>
                    ) : issuesError ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                        {issuesError}
                      </div>
                    ) : filteredAndSortedIssues.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                        No issues match the selected filters.
                      </div>
                    ) : (
                      <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("severity")}
                                  className="flex items-center gap-1"
                                >
                                  Severity {sortIcon("severity")}
                                </button>
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("type")}
                                  className="flex items-center gap-1"
                                >
                                  Type {sortIcon("type")}
                                </button>
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("file")}
                                  className="flex items-center gap-1"
                                >
                                  File {sortIcon("file")}
                                </button>
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("rule")}
                                  className="flex items-center gap-1"
                                >
                                  Rule {sortIcon("rule")}
                                </button>
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("message")}
                                  className="flex items-center gap-1"
                                >
                                  Message {sortIcon("message")}
                                </button>
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => toggleSort("line")}
                                  className="flex items-center gap-1"
                                >
                                  Line {sortIcon("line")}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedIssues.map((issue) => (
                              <tr
                                key={issue.key}
                                className="border-t border-slate-100 align-top"
                              >
                                <td className="px-3 py-2">
                                  <Badge
                                    variant="outline"
                                    className={getSeverityBadgeClass(
                                      issue.severity,
                                    )}
                                  >
                                    {issue.severity ?? "UNKNOWN"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant="outline"
                                    className={getIssueTypeBadgeClass(
                                      issue.type,
                                    )}
                                  >
                                    {issue.type ?? "UNKNOWN"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {getFileNameFromComponent(issue.component)}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {issue.rule ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-slate-700 max-w-[440px]">
                                  <p
                                    className="truncate"
                                    title={issue.message ?? ""}
                                  >
                                    {issue.message ?? "-"}
                                  </p>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {issue.line ?? "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2">
                          <button
                            type="button"
                            disabled={issuePage === 1}
                            onClick={() =>
                              setIssuePage((p) => Math.max(1, p - 1))
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-muted-foreground">
                            Page {issuePage} of {totalIssuePages} (
                            {filteredAndSortedIssues.length} items)
                          </span>
                          <button
                            type="button"
                            disabled={issuePage === totalIssuePages}
                            onClick={() =>
                              setIssuePage((p) =>
                                Math.min(totalIssuePages, p + 1),
                              )
                            }
                            className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Tabs>
  );
}
