import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import {
  formatDuration,
  formatRelativeTime,
  ProviderIcon,
  TOOLTIP_STYLE,
} from "../utilities.js";
import { type ProviderFilter, type DeploymentAnalyticsData } from "../types.js";

export default function BuildTimesTab({
  durationDistribution,
  longestBuilds,
  providerStats,
  connectedVercel,
  connectedRender,
  providerFilter,
}: {
  durationDistribution: DeploymentAnalyticsData["durationDistribution"];
  longestBuilds: DeploymentAnalyticsData["longestBuilds"];
  providerStats: DeploymentAnalyticsData["providerStats"];
  connectedVercel: boolean;
  connectedRender: boolean;
  providerFilter: ProviderFilter;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Build Duration Distribution */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Build Duration Distribution
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            How long deployments take, bucketed by duration. Most builds should
            complete within 3 minutes. Builds above 10 min may indicate missing
            caching or heavy install steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={durationDistribution}
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
                formatter={(val, name) => [
                  val,
                  name === "vercel" ? "Vercel deploys" : "Render deploys",
                ]}
              />
              <Legend
                formatter={(v: string) =>
                  v === "vercel" ? "Vercel" : "Render"
                }
                iconType="circle"
                iconSize={8}
              />

              {providerFilter !== "render" && connectedVercel && (
                <Bar
                  dataKey="vercel"
                  name="vercel"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              )}
              {providerFilter !== "vercel" && connectedRender && (
                <Bar
                  dataKey="render"
                  name="render"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Slowest Builds */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">
            Slowest Builds
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            The 5 longest-running deployments in this period. Review these
            commits for heavy deps, large assets, or missing caches.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {longestBuilds.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {longestBuilds.map((dep: any, i: any) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors"
                >
                  <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div
                    className={`p-1.5 rounded-md shrink-0 ${dep.provider === "vercel" ? "bg-slate-100" : "bg-emerald-50"}`}
                  >
                    <ProviderIcon provider={dep.provider} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate text-slate-600">
                      {dep.branch}
                    </p>
                    {dep.commitMessage && (
                      <p
                        className="text-xs truncate max-w-[200px] text-slate-700"
                        title={dep.commitMessage}
                      >
                        {dep.commitMessage}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatRelativeTime(dep.startedAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-600">
                      {formatDuration(dep.durationSec)}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize border-slate-200"
                    >
                      {dep.environment}
                    </Badge>
                  </div>
                  {dep.url && (
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">
              No completed builds with duration data.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Provider Success Rate */}
      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Provider Success Rate
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Deployment success rate per provider. Target is 90%+. Below 85%
            warrants investigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[100px]">
          {providerStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={providerStats}
                layout="vertical"
                margin={{ top: 5, right: 24, left: 24, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  type="category"
                  dataKey="provider"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  width={55}
                  tick={{ fill: "#64748b" }}
                />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(val) => [`${val}%`, "Success Rate"]}
                />
                <ReferenceLine
                  x={90}
                  stroke="#22c55e"
                  strokeDasharray="4 2"
                  label={{
                    value: "90% target",
                    position: "top",
                    fontSize: 10,
                    fill: "#22c55e",
                  }}
                />
                <Bar
                  dataKey="successRate"
                  name="Success Rate"
                  radius={[0, 4, 4, 0]}
                >
                  {providerStats.map((s: any) => (
                    <Cell
                      key={s.provider}
                      fill={
                        s.successRate >= 95
                          ? "#22c55e"
                          : s.successRate >= 85
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No provider data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
