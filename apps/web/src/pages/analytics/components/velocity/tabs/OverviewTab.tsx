import {
  Clock,
  GitMerge,
  ShieldAlert,
  TrendingUp,
  CircleDashed,
  Rocket,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";

import {
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from "recharts";
import type { VelocityApiResponse } from "../types.js";
import { TOOLTIP_STYLE } from "../utlities.js";

export default function OverviewTab({
  velocity,
  stateBreakdown,
  qualitySignalData,
  formatHours,
  formatShortDate,
}: {
  velocity: VelocityApiResponse;
  stateBreakdown: any;
  qualitySignalData: any[];
  formatHours: (hours: any) => any;
  formatShortDate: (iso: any) => any;
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total Deployments */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">First Review</p>
            <Rocket className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700 tracking-tighter">
            {formatHours(
              velocity.summary?.median_first_review_h ??
                velocity.review_time?.avg_first_review_h,
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Median time from open to first review
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">Avg Lead Time</p>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-indigo-700 tracking-tighter">
            {formatHours(
              velocity.summary?.median_merge_h ??
                velocity.review_time?.avg_merge_h,
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Median open to merge cycle time
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">
              Review Coverage
            </p>
            <ShieldAlert className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-emerald-700">
            {(velocity.summary?.review_coverage_pct ?? 0).toFixed(1)}%
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Merged PRs with at least one external review
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">Open PRs</p>
            <CircleDashed className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-indigo-700">
            {velocity.summary?.open_prs ?? 0}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Active in this repository
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">Merged PRs</p>
            <GitMerge className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-indigo-700">
            {velocity.summary?.merged_prs ?? 0}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Merged during selected timeframe
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-500">
              Avg PR Change Volume
            </p>
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-amber-700">
            {Math.round(velocity.summary?.avg_pr_changes ?? 0)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <p className="text-xs text-slate-700 mt-2 font-medium">
              Additions + deletions per merged PR
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">
              Merge Throughput Over Time
            </CardTitle>
            <CardDescription>
              Daily merge count trend across the selected window.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {velocity.throughput.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={velocity.throughput}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(str) => formatShortDate(str)}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Merges"
                    stroke="#6366f1"
                    fillOpacity={0.2}
                    fill="#6366f1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No merge activity in this timeframe.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">PR State Mix</CardTitle>
            <CardDescription>
              Current distribution of open, merged, and closed PRs.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stateBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stateBreakdown}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={2}
                    fill={"#6366f1"}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No PR state data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader>
          <CardTitle className="text-md">Quality Signal Watchlist</CardTitle>
          <CardDescription>
            Counts that indicate operational drag and code review risk.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {qualitySignalData.map((signal: any) => (
            <div
              key={signal.key}
              className={`rounded-lg border p-4 ${signal.bg}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {signal.key}
              </p>
              <p
                className={`text-3xl font-black tracking-tighter mt-1 ${signal.color}`}
              >
                {signal.value}
              </p>
              <p className="text-xs mt-1 text-slate-600">{signal.hint}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
