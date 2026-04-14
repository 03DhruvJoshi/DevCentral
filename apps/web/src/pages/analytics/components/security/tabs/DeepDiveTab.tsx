import { Code, SlidersHorizontal, FileCode2, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";

import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";

import type { ValueMode, SeverityScope } from "../types.js";
import {
  ITEMS_PER_TOP_CARD_PAGE,
  getFileNameFromComponent,
} from "../utilities.js";

export default function DeepDiveTab({
  issueInsights,
  blockerCount,
  criticalCount,
  majorCount,
  vulnerabilityTypeCount,

  codeSmellTypeCount,
  duplicatedLinesDensity,
  coverageData,
  coverageValue,
  riskSnapshotText,
  topFiles,

  topFilesPage,
  setTopFilesPage,
  topFilesTotalPages,
  topRules,
  topRulesPage,
  setTopRulesPage,
  topRulesTotalPages,
  valueMode,
  setValueMode,
  severityScope,
  setSeverityScope,
  hideZeroSeries,
  setHideZeroSeries,
  metrics,
  formatTechDebt,
  bugTypeCount,
  minorCount,
  securityHotspots,
  paginatedTopRules,
  paginatedTopFiles,
}: {
  issueInsights: any;
  blockerCount: number;
  criticalCount: number;
  majorCount: number;
  vulnerabilityTypeCount: number;

  codeSmellTypeCount: number;
  duplicatedLinesDensity: number;
  coverageData: any[];
  coverageValue: number;
  riskSnapshotText: string;
  topFiles: any[];

  topFilesPage: number;
  setTopFilesPage: (page: any) => void;
  topFilesTotalPages: number;
  topRules: any[];
  topRulesPage: number;
  setTopRulesPage: (page: any) => void;
  topRulesTotalPages: number;
  valueMode: ValueMode;
  setValueMode: (mode: ValueMode) => void;
  severityScope: SeverityScope;
  setSeverityScope: (scope: SeverityScope) => void;
  hideZeroSeries: boolean;
  setHideZeroSeries: (hide: boolean) => void;
  metrics: any;
  formatTechDebt: (sqaleIndex: string) => string;
  bugTypeCount: number;
  minorCount: number;
  securityHotspots: number;
  paginatedTopRules: any;
  paginatedTopFiles: any;
}) {
  return (
    <>
      <Card className="border-slate-200 bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
            Analysis Filters
          </CardTitle>
          <CardDescription>
            Customize issue visibility and switch between absolute counts and
            density.
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
              <option value="delivery">Delivery impact (major + minor)</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Display Mode
            </span>
            <select
              value={valueMode}
              onChange={(e) => setValueMode(e.target.value as ValueMode)}
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="absolute">Absolute issue count</option>
              <option value="density">Issue density per 1k LOC</option>
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
              <Clock className="h-5 w-5 text-amber-500" /> Technical Debt
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
              <Code className="h-5 w-5 text-slate-500" /> Code Duplication
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
            <CardTitle className="text-lg">Unit Test Coverage</CardTitle>
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
                <RechartsTooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow:
                      "0 8px 24px -4px rgb(0 0 0 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
                    padding: "8px 12px",
                  }}
                />
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
            <CardTitle className="text-lg">Issue Type Matrix</CardTitle>
            <CardDescription>
              Exact unresolved issue counts by semantic type and severity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid   lg:grid-cols-2 gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Vulnerabilities</p>
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
              <p className="text-xs text-muted-foreground">Security Hotspots</p>
              <p className="text-xl font-black text-slate-800 mt-1">
                {securityHotspots}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">Code Smells</p>
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
              <p className="text-xs text-muted-foreground">Critical</p>
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
              Contextual summary generated from current repository metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-800">Risk Snapshot</p>
              <p className="mt-1">{riskSnapshotText}</p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-800">
                Coverage And Duplication
              </p>
              <p className="mt-1">
                Coverage is <strong>{coverageValue}%</strong> and duplication is{" "}
                <strong>{duplicatedLinesDensity}%</strong>.{" "}
                {coverageValue < 80
                  ? "Increase test depth in critical modules to reduce delivery risk."
                  : "Coverage is healthy; focus now on reducing remaining defect classes."}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-800">Priority Queue</p>
              <ul className="mt-1 space-y-1 text-slate-700">
                <li>1. Resolve blocker and critical violations first.</li>
                <li>
                  2. Triage vulnerabilities and bugs by affected components.
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
            <CardTitle className="text-lg">Top Affected Files</CardTitle>
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
              paginatedTopFiles.map((file: any) => (
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
                    setTopFilesPage((p: any) => Math.max(1, p - 1))
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
                    setTopFilesPage((p: any) =>
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
            <CardTitle className="text-lg">Top Violated Rules</CardTitle>
            <CardDescription>
              Most frequently triggered Sonar rules in current backlog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rule-level issue data available.
              </p>
            ) : (
              paginatedTopRules.map((rule: any) => (
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
                    setTopRulesPage((p: any) => Math.max(1, p - 1))
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
                    setTopRulesPage((p: any) =>
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
    </>
  );
}
