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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { Velocity } from "../types.js";
import { TOOLTIP_STYLE } from "../utlities.js";

export default function FlowTab({
  sizeData,
  velocity,
  formatHours,
}: {
  sizeData: { size: string; count: unknown }[];
  velocity: Velocity;
  formatHours: (hours: number | null) => string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">PR Size Distribution</CardTitle>
            <CardDescription>
              Larger PRs can increase review lag and defect probability.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sizeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="size"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontWeight: "bold" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: "#64748b" }}
                />
                <RechartsTooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                  fill="#6366f1"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">Branch PR Activity</CardTitle>
            <CardDescription>
              Which base branches absorb the most pull-request traffic.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {velocity.branch_activity && velocity.branch_activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="120%">
                <BarChart
                  data={velocity.branch_activity}
                  margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="branch"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="prs" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No branch activity in this timeframe.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-md">Branch Merge Health</CardTitle>
          <CardDescription>
            Throughput and review/merge latency by branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {velocity.branch_merge_stats &&
          velocity.branch_merge_stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 font-semibold">Branch</th>
                    <th className="py-2.5 px-4 font-semibold">Merged PRs</th>
                    <th className="py-2.5 px-4 font-semibold">
                      Avg First Review
                    </th>
                    <th className="py-2.5 px-4 font-semibold">
                      Avg Merge Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {velocity.branch_merge_stats.map((row) => (
                    <tr
                      key={row.branch}
                      className="bg-slate-50 hover:bg-white transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {row.branch}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {row.merged_prs}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {formatHours(row.avg_review_h)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {formatHours(row.avg_merge_h)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Not enough merged PR data for branch-level trending.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
