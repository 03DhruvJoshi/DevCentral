import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";

import {
  AreaChart,
  Area,
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

import type {
  ProviderFilter,
  DeploymentAnalyticsData,
} from "../types.js";
import { TOOLTIP_STYLE, TrendIndicator } from "../utilities.js";

export default function OverviewTab({
  providerFilter,
  connectedVercel,
  connectedRender,
  statusBreakdown,
  velocityTrend,
  filteredFrequency,
  summary,
}: {
  providerFilter: ProviderFilter;
  connectedVercel: boolean;
  connectedRender: boolean;
  statusBreakdown: DeploymentAnalyticsData["statusBreakdown"];
  velocityTrend: DeploymentAnalyticsData["velocityTrend"];
  filteredFrequency: DeploymentAnalyticsData["frequencyOverTime"];
  summary: DeploymentAnalyticsData["summary"];
}) {
  const statusDonutData = [
    { name: "Success", value: statusBreakdown.success, color: "#22c55e" },
    { name: "Failed", value: statusBreakdown.failed, color: "#ef4444" },
    { name: "Building", value: statusBreakdown.building, color: "#6366f1" },
    { name: "Cancelled", value: statusBreakdown.cancelled, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Deployment Frequency area chart */}
      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base text-slate-900">
                Deployment Frequency
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 text-slate-500">
                Daily deploys per provider. A consistent rhythm signals a
                healthy shipping culture. Gaps may indicate blocked pipelines or
                feature-freeze periods.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
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
                <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
                fontSize={11}
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
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Deployment Outcomes
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Breakdown by final status across all providers and environments.
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
            <p className="text-sm text-slate-400">No status data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Velocity comparison */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Velocity Trend
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Recent half-period vs earlier half-period deploy rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Earlier period</p>
              <p className="text-2xl font-bold text-slate-900">
                {velocityTrend.older}
              </p>
              <p className="text-xs text-slate-400">deploys/day</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Recent period</p>
              <p className="text-2xl font-bold text-slate-900">
                {velocityTrend.recent}
              </p>
              <p className="text-xs text-slate-400">deploys/day</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-slate-500">Change:</span>
              <TrendIndicator pct={velocityTrend.changePct} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
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
      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Status Summary
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Absolute counts per outcome. Use this alongside success rate to
            gauge scale of issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Successful",
                count: statusBreakdown.success,
                valueCls: "text-green-600",
                cardCls: "bg-green-50 border-green-200",
              },
              {
                label: "Failed",
                count: statusBreakdown.failed,
                valueCls: "text-red-600",
                cardCls: "bg-red-50 border-red-200",
              },
              {
                label: "Building",
                count: statusBreakdown.building,
                valueCls: "text-indigo-600",
                cardCls: "bg-indigo-50 border-indigo-200",
              },
              {
                label: "Cancelled",
                count: statusBreakdown.cancelled,
                valueCls: "text-slate-600",
                cardCls: "bg-slate-100 border-slate-200",
              },
            ].map(({ label, count, valueCls, cardCls }) => (
              <div
                key={label}
                className={`rounded-xl border shadow-sm p-3 text-center ${cardCls}`}
              >
                <p className={`text-2xl font-bold ${valueCls}`}>{count}</p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
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
  );
}
