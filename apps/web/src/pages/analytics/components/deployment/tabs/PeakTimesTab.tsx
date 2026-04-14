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
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { DeploymentAnalyticsData } from "../types.js";
import { TOOLTIP_STYLE } from "../utilities.js";

export default function PeakTimesTab({
  summary,
  peakHours,
  weekdayDist,
}: {
  summary: DeploymentAnalyticsData["summary"];
  peakHours: DeploymentAnalyticsData["peakHours"];
  weekdayDist: DeploymentAnalyticsData["weekdayDist"];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Deployments by Hour */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Deployments by Hour (UTC)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Which UTC hours see the most deployment activity. Use this to
            schedule maintenance windows and identify whether deploys are
            clustered in business hours or off-peak.
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
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  tickFormatter={(v: string) => v.slice(0, 2)}
                  interval={2}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [val, "Deployments"]}
                  labelFormatter={(l) => `Hour: ${l} UTC`}
                />
                <Bar dataKey="count" name="Deployments" radius={[3, 3, 0, 0]}>
                  {peakHours.map((entry) => {
                    const max = Math.max(...peakHours.map((h) => h.count));
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
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No timing data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployments by Day of Week */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Deployments by Day of Week
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Deployment distribution across the week. Friday/weekend spikes may
            indicate risk. Consider enforcing a deploy freeze on Fridays after
            cutoff times.
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
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tick={{ fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [val, "Deployments"]}
                />
                <Bar dataKey="count" name="Deployments" radius={[4, 4, 0, 0]}>
                  {weekdayDist.map((entry) => {
                    const isRisky =
                      entry.day === "Fri" ||
                      entry.day === "Sat" ||
                      entry.day === "Sun";
                    return (
                      <Cell
                        key={entry.day}
                        fill={isRisky ? "#f59e0b" : "#6366f1"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No timing data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak insights summary */}
      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Peak Activity Insights
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
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
                  ? +((weekendCount / summary.totalDeploys) * 100).toFixed(1)
                  : 0;
              return [
                {
                  label: "Busiest Hour (UTC)",
                  value: busiest.label ?? "—",
                  sub: `${busiest.count} deploys`,
                  warn: false,
                },
                {
                  label: "Busiest Day",
                  value: busiestDay.day ?? "—",
                  sub: `${busiestDay.count} deploys`,
                  warn: false,
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
                className={`rounded-xl border shadow-sm p-4 ${
                  warn
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                {warn && (
                  <p className="text-xs text-yellow-700 mt-1.5 font-medium">
                    High weekend activity — consider deploy freeze policies.
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
