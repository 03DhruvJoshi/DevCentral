import { ExternalLink, CheckCircle2 } from "lucide-react";

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
} from "recharts";
import {
  TOOLTIP_STYLE,
  ProviderIcon,
  formatAbsDate,
  formatDuration,
} from "../utilities.js";
import type { DeploymentAnalyticsData } from "../types.js";

export default function FailuresTab({
  summary,
  failureRateOverTime,
  failedDeployments,
}: {
  summary: DeploymentAnalyticsData["summary"];
  failureRateOverTime: DeploymentAnalyticsData["failureRateOverTime"];
  failedDeployments: DeploymentAnalyticsData["failedDeployments"];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Failure Rate Over Time */}
      <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Failure Rate Over Time
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Daily success vs failure counts. Spikes in failures may correlate
            with specific commits, dependency updates, or infrastructure issues.
            Cross-reference with the Activity Log for specifics.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={failureRateOverTime}
              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
            >
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
                stackId="s"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="failed"
                name="failed"
                fill="#ef4444"
                stackId="s"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MTTR */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Mean Time to Recovery (MTTR)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Average time between a failed deployment and the next successful one
            on the same provider. Lower MTTR indicates your team detects and
            fixes issues quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div
              className={`text-5xl font-black ${
                summary.mttrMin === null
                  ? "text-slate-400"
                  : summary.mttrMin <= 30
                    ? "text-green-600"
                    : summary.mttrMin <= 120
                      ? "text-yellow-600"
                      : "text-red-600"
              }`}
            >
              {summary.mttrMin === null ? "—" : `${summary.mttrMin}m`}
            </div>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              {summary.mttrMin === null
                ? "No recovery data yet — either no failures occurred or all failures are unresolved."
                : summary.mttrMin <= 30
                  ? "Excellent recovery time. Your team responds to incidents rapidly."
                  : summary.mttrMin <= 120
                    ? "Moderate recovery time. Consider alerting improvements."
                    : "High recovery time. Review your incident response process."}
            </p>
            <div className="grid grid-cols-3 gap-3 w-full text-center mt-2">
              {[
                { label: "Target", value: "≤ 30m", cls: "text-green-600", bg: "bg-green-50 border-green-200" },
                { label: "Acceptable", value: "≤ 120m", cls: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
                { label: "At Risk", value: "> 120m", cls: "text-red-600", bg: "bg-red-50 border-red-200" },
              ].map(({ label, value, cls, bg }) => (
                <div key={label} className={`rounded-xl border shadow-sm p-2.5 ${bg}`}>
                  <p className={`text-sm font-bold ${cls}`}>{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Deployments list */}
      <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900">
            Failed Deployments
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-slate-500">
            Most recent deployment failures. Check commit messages and branches
            for patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {failedDeployments.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {failedDeployments.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-white transition-colors"
                >
                  <div
                    className={`p-1.5 rounded-md shrink-0 mt-0.5 ${dep.provider === "vercel" ? "bg-slate-100" : "bg-emerald-50"}`}
                  >
                    <ProviderIcon provider={dep.provider} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-600 truncate max-w-[120px]">
                        {dep.branch}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs capitalize border-slate-200"
                      >
                        {dep.environment}
                      </Badge>
                    </div>
                    {dep.commitMessage && (
                      <p
                        className="text-xs mt-0.5 truncate max-w-[220px] text-slate-700"
                        title={dep.commitMessage}
                      >
                        {dep.commitMessage}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatAbsDate(dep.startedAt)}
                      {dep.commitSha && (
                        <span className="font-mono ml-1 opacity-60">
                          {dep.commitSha.slice(0, 7)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {dep.durationSec !== null && (
                      <p className="text-xs text-slate-400">
                        {formatDuration(dep.durationSec)}
                      </p>
                    )}
                    {dep.url && (
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 transition-colors inline-block mt-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center gap-2.5">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-sm font-semibold text-slate-700">
                No failures in this period
              </p>
              <p className="text-xs text-slate-400">Keep it up!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
