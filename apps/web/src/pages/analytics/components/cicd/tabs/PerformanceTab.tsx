import { Timer, ExternalLink } from "lucide-react";

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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

import type CICD from "../types.js";
import { formatDuration, TOOLTIP_STYLE } from "../utilities.js";

export default function PerformanceTab({ cicd }: { cicd: CICD }) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue vs Execution */}
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Queue vs Execution Lag</CardTitle>
            <CardDescription>
              Visualizing runner bottleneck delays prior to job execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {cicd.queue_vs_execution.runs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cicd.queue_vs_execution.runs}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="run_id"
                    tickFormatter={(val) => `#${val.toString().slice(-4)}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                    labelFormatter={(label) => `Run ID: ${label}`}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar
                    dataKey="queue_min"
                    name="Queue Wait (m)"
                    stackId="a"
                    fill="#f59e0b"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="exec_min"
                    name="Execution Time (m)"
                    stackId="a"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No queue telemetry.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slowest Jobs Table */}
        <Card className="border-slate-200 shadow-sm bg-slate-50 flex flex-col">
          <CardHeader className="px-5 py-4 border-b border-slate-200 bg-white">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Timer className="h-5 w-5 text-orange-600" /> Critical Time
              Bottlenecks
            </CardTitle>
            <CardDescription>
              The most expensive individual CI jobs by duration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {cicd.slowest_jobs.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                {cicd.slowest_jobs.map((job) => (
                  <div
                    key={`${job.run_id}-${job.job_name}`}
                    className="p-4 hover:bg-white transition-colors flex justify-between items-center"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-slate-800 truncate mb-1">
                        {job.job_name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 uppercase ${
                            job.status === "success"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {job.status || "Unknown"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          Run #{job.run_id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                        {formatDuration(job.duration_min)}
                      </span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No duration data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Breakdown</CardTitle>
            <CardDescription>
              Success, failure, queue, and duration profile by workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-y-auto space-y-2">
            {(cicd.workflow_breakdown ?? []).length > 0 ? (
              cicd.workflow_breakdown.map((wf) => (
                <div
                  key={wf.workflow}
                  className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="font-semibold text-slate-800 truncate">
                      {wf.workflow}
                    </p>
                    <Badge variant="outline" className="font-mono">
                      {wf.total_runs} runs
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>Success: {wf.success_rate}%</span>
                    <span>Failure: {wf.failure_rate}%</span>
                    <span>Avg queue: {formatDuration(wf.avg_queue_min)}</span>
                    <span>Avg exec: {formatDuration(wf.avg_duration_min)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No workflow breakdown data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Branch Performance</CardTitle>
            <CardDescription>
              Branch-level CI quality for throughput and execution speed.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            {(cicd.branch_breakdown ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cicd.branch_breakdown ?? []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar
                    dataKey="success_rate"
                    name="Success %"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No branch breakdown data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
