import { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Github,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs.js";

import { Badge } from "../../../../components/ui/badge.js";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, type Repository } from "../types.js";
import type {
  SonarMetrics,
  SeverityScope,
  ValueMode,
  SortDirection,
  SortableIssueField,
  SonarIssueInsights,
} from "./types.js";

import {
  toNumber,
  clampPercent,
  getFileNameFromComponent,
  ITEMS_PER_TOP_CARD_PAGE,
  ITEMS_PER_TOP_RULE_PAGE,
  ISSUE_ROWS_PER_PAGE,
  formatTechDebt,
} from "./utilities.js";
import OverviewTab from "./tabs/OverviewTab.js";
import DeepDiveTab from "./tabs/DeepDiveTab.js";
import ActivityLogTab from "./tabs/ActivityLogTab.js";

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
  const [issueInsights, setIssueInsights] = useState<SonarIssueInsights | null>(null);
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
    const token = localStorage.getItem("devcentral_token");

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
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetch(
            `${API_BASE_URL}/api/analytics/sonar/${selectedRepo.owner}/${selectedRepo.name}/issues`,
            { headers: { Authorization: `Bearer ${token}` } },
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
          setIssuesError("Issue-level deep dive data is unavailable right now.");
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
  const codeSmellTypeCount = byType.CODE_SMELL ?? 0;

  const topFilesTotalPages = Math.max(1, Math.ceil(topFiles.length / ITEMS_PER_TOP_CARD_PAGE));
  const topRulesTotalPages = Math.max(1, Math.ceil(topRules.length / ITEMS_PER_TOP_RULE_PAGE));

  const paginatedTopFiles = topFiles.slice(
    (topFilesPage - 1) * ITEMS_PER_TOP_CARD_PAGE,
    topFilesPage * ITEMS_PER_TOP_CARD_PAGE,
  );

  const paginatedTopRules = topRules.slice(
    (topRulesPage - 1) * ITEMS_PER_TOP_RULE_PAGE,
    topRulesPage * ITEMS_PER_TOP_RULE_PAGE,
  );

  const severityRank: Record<string, number> = {
    BLOCKER: 5, CRITICAL: 4, MAJOR: 3, MINOR: 2, INFO: 1, UNKNOWN: 0,
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

    return [...filtered].sort((a, b) => {
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
  }, [deepDiveIssues, issueSearch, issueSeverityFilter, issueTypeFilter, sortField, sortDirection]);

  const totalIssuePages = Math.max(1, Math.ceil(filteredAndSortedIssues.length / ISSUE_ROWS_PER_PAGE));
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
    blockerViolations * 4 + criticalViolations * 3 + majorViolations * 2 + minorViolations;
  const coveragePenalty = Math.max(0, 80 - coverageValue);
  const duplicationPenalty = Math.max(0, duplicatedLinesDensity - 5) * 2;
  const riskIndex = Math.round(
    weightedIssuePressure + coveragePenalty + duplicationPenalty + vulnerabilities * 4 + bugs * 3,
  );

  let riskLevel: "High" | "Moderate" | "Low" = "Low";
  if (riskIndex >= 120) riskLevel = "High";
  else if (riskIndex >= 50) riskLevel = "Moderate";

  let riskBadgeClass = "border-emerald-200 bg-emerald-50 text-emerald-600";
  if (riskLevel === "High") riskBadgeClass = "border-rose-200 bg-rose-50 text-rose-600";
  else if (riskLevel === "Moderate") riskBadgeClass = "border-amber-200 bg-amber-50 text-amber-600";

  let riskSnapshotText =
    "Low risk posture. Maintain momentum by addressing remaining hotspots and preventing regression through CI quality gates.";
  if (riskLevel === "High") {
    riskSnapshotText =
      "High aggregate risk. Prioritize blocker and critical violations, then close vulnerability and bug backlog before release.";
  } else if (riskLevel === "Moderate") {
    riskSnapshotText =
      "Moderate risk posture. Focus on high-severity fixes and improve coverage to reduce release uncertainty.";
  }

  const tabItems = [
    { value: "overview", label: "Overview" },
    { value: "deepdive", label: "Deep Dive" },
    { value: "activitylog", label: "Issue Register" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(244,63,94,0.07),transparent)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 ring-1 ring-rose-500/20 shadow-sm">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Static Application Security Testing
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Continuous code inspection for{" "}
                <strong className="text-slate-700">{selectedRepo.name}</strong>{" "}
                · powered by SonarQube
              </p>
            </div>
          </div>
          {metrics && (
            <Badge
              className={`flex items-center gap-1.5 py-1.5 px-3 border transition-colors ${riskBadgeClass}`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="font-medium">{riskLevel} Risk · Score {riskIndex}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="h-[500px] flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-rose-500" />
          <p className="font-medium text-slate-700">Analyzing static code metrics...</p>
          <p className="text-sm text-slate-500">Fetching historical data from SonarCloud</p>
        </div>
      ) : error ? (
        <div className="h-[300px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 shadow-sm text-muted-foreground">
          <Search className="h-12 w-12 mb-3 text-slate-300" />
          <p className="font-medium text-slate-700">{error}</p>
          <p className="text-sm mt-1 text-center max-w-sm text-slate-500">
            Ensure the repository is connected to your GitHub app and has completed a SonarCloud
            pipeline run.
          </p>
        </div>
      ) : metrics ? (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full animate-in fade-in duration-500"
        >
          <TabsList className="mb-2 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <OverviewTab
              metrics={metrics}
              securityHotspots={securityHotspots}
              totalSeverityIssues={totalSeverityIssues}
              ncloc={ncloc}
              riskBadgeClass={riskBadgeClass}
              riskLevel={riskLevel}
              riskIndex={riskIndex}
            />
          </TabsContent>

          <TabsContent value="deepdive" className="mt-4 space-y-6">
            <DeepDiveTab
              blockerCount={blockerCount}
              criticalCount={criticalCount}
              majorCount={majorCount}
              codeSmellTypeCount={codeSmellTypeCount}
              vulnerabilityTypeCount={vulnerabilityTypeCount}
              bugTypeCount={bugTypeCount}
              securityHotspots={securityHotspots}
              paginatedTopRules={paginatedTopRules}
              paginatedTopFiles={paginatedTopFiles}
              topFiles={topFiles}
              topRules={topRules}
              valueMode={valueMode}
              severityScope={severityScope}
              hideZeroSeries={hideZeroSeries}
              setValueMode={setValueMode}
              setSeverityScope={setSeverityScope}
              setHideZeroSeries={setHideZeroSeries}
              metrics={metrics}
              formatTechDebt={formatTechDebt}
              minorCount={minorCount}
              issueInsights={issueInsights}
              riskSnapshotText={riskSnapshotText}
              coverageData={coverageData}
              topFilesTotalPages={topFilesTotalPages}
              topRulesTotalPages={topRulesTotalPages}
              setTopFilesPage={setTopFilesPage}
              setTopRulesPage={setTopRulesPage}
              topFilesPage={topFilesPage}
              topRulesPage={topRulesPage}
              duplicatedLinesDensity={duplicatedLinesDensity}
              coverageValue={coverageValue}
            />
          </TabsContent>

          <TabsContent value="activitylog" className="mt-4 space-y-6">
            <ActivityLogTab
              isIssuesLoading={isIssuesLoading}
              issuesError={issuesError}
              filteredAndSortedIssues={filteredAndSortedIssues}
              toggleSort={toggleSort}
              sortIcon={sortIcon}
              issuePage={issuePage}
              totalIssuePages={totalIssuePages}
              setIssuePage={setIssuePage}
              issueSeverityFilter={issueSeverityFilter}
              setIssueSeverityFilter={setIssueSeverityFilter}
              issueTypeFilter={issueTypeFilter}
              setIssueTypeFilter={setIssueTypeFilter}
              issueSearch={issueSearch}
              setIssueSearch={setIssueSearch}
              paginatedIssues={paginatedIssues}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
