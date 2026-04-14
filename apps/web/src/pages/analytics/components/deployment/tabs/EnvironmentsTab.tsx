import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";

import {
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
} from "recharts";

import { TOOLTIP_STYLE, formatDuration } from "../utilities.js";
import { type DeploymentAnalyticsData } from "../types.js";

const PAGE_SIZE = 8;

type SortCol = "branch" | "total" | "success" | "failed" | "successRate" | "avgDurationSec";

export default function EnvironmentsTab({
  envBreakdown,
  branchActivity,
}: {
  envBreakdown: DeploymentAnalyticsData["envBreakdown"];
  branchActivity: DeploymentAnalyticsData["branchActivity"];
}) {
  const [sortCol, setSortCol] = useState<SortCol>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "branch" ? "asc" : "desc");
    }
    setPage(0);
  }

  const sortedBranches = useMemo(() => {
    return [...branchActivity].sort((a, b) => {
      let aVal: string | number =
        (a as unknown as Record<string, string | number>)[sortCol] ?? "";
      let bVal: string | number =
        (b as unknown as Record<string, string | number>)[sortCol] ?? "";
      if (sortCol === "avgDurationSec") {
        aVal = (a.avgDurationSec as number | null) ?? -1;
        bVal = (b.avgDurationSec as number | null) ?? -1;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [branchActivity, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedBranches.length / PAGE_SIZE));
  const paginated = sortedBranches.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i).slice(
    Math.max(0, page - 2),
    page + 3,
  );

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col)
      return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-indigo-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-indigo-600" />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Deployments by Environment pie */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Deployments by Environment
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Proportion across Production, Preview, and Staging. A high preview
            ratio suggests thorough pre-release validation before production
            deploys.
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
                  {envBreakdown.map((entry: any) => (
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
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No environment data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch deployment activity bar */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Branch Deployment Activity
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Which branches triggered the most deployments. High activity on
            feature branches indicates frequent iteration; low main-branch
            activity may indicate infrequent releases.
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
                  stroke="#e2e8f0"
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
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No branch data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch Deep Dive — sortable, paginated table */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <GitBranch className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Branch Deep Dive
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Per-branch breakdown — click column headers to sort.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {branchActivity.length} branch
            {branchActivity.length !== 1 ? "es" : ""}
          </p>
        </div>

        {branchActivity.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
            <GitBranch className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-500">No branch data available.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 text-left">
                      <button
                        onClick={() => handleSort("branch")}
                        className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Branch <SortIcon col="branch" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleSort("total")}
                        className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Total <SortIcon col="total" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleSort("success")}
                        className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Success <SortIcon col="success" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleSort("failed")}
                        className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Failed <SortIcon col="failed" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleSort("successRate")}
                        className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Success Rate <SortIcon col="successRate" />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleSort("avgDurationSec")}
                        className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Avg Duration <SortIcon col="avgDurationSec" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((b: any) => (
                    <tr
                      key={b.branch}
                      className="hover:bg-white transition-colors bg-slate-50"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {b.branch}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        {b.total}
                      </td>
                      <td className="py-2.5 px-4 text-right text-green-600 font-medium">
                        {b.success}
                      </td>
                      <td className="py-2.5 px-4 text-right text-red-600 font-medium">
                        {b.failed}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            b.successRate >= 95
                              ? "text-green-600"
                              : b.successRate >= 85
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {b.successRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatDuration(b.avgDurationSec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {page * PAGE_SIZE + 1}–
                  {Math.min(
                    (page + 1) * PAGE_SIZE,
                    sortedBranches.length,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {sortedBranches.length}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {visiblePages.map((i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-7 w-7 text-xs rounded-md border transition-colors ${
                      i === page
                        ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
