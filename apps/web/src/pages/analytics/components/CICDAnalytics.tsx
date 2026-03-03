import { useState, useEffect } from "react";
import {
  GitBranch,
  ShieldAlert,
  Github,
  ExternalLink,
  Lock,
  Loader2,
  ShieldCheck,
  Bug,
  AlertTriangle,
  Code,
  Search,
  Clock,
  GitMerge,
  AlertOctagon,
  Ghost,
  Activity,
  Timer,
  Zap,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useNavigate } from "react-router-dom";


import { API_BASE_URL, token } from "./types.js";
import type { Repository, CICD } from "./types.js";
 
export default function CICDAnalytics(props: {selectedRepo: Repository}) {
    const { selectedRepo } = props;
    const navigate = useNavigate();

    
      const [cicd, setCicd] = useState<CICD | null>(null);
      const [isCicdLoading, setIsCicdLoading] = useState(false);
      const [cicdError, setCicdError] = useState<string | null>(null);

        useEffect(() => {
    if (!selectedRepo) return;

    async function fetchCicd() {
      setCicd(null);
      setCicdError(null);
      setIsCicdLoading(true);

      try {
 
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/analytics/cicd/${selectedRepo?.owner}/${selectedRepo?.name}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch CICD metrics");
        const data = await res.json();
        setCicd(data);
      } catch (err) {
        setCicdError("Failed to fetch CICD metrics");
        console.error("CICD Fetch Error:", err);
      } finally {
        setIsCicdLoading(false);
      }
    }
    fetchCicd();
  }, [navigate, selectedRepo]);

  return (
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                  CI / CD Quality Metrics
                </CardTitle>
                <CardDescription>
                  Showing recent CI / CD quality metrics for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCicdLoading ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p>Analyzing CI / CD quality metrics...</p>
                  </div>
                ) : cicdError ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-4 text-destructive" />
                    <p className="text-destructive">{cicdError}</p>
                  </div>
                ) : cicd ? (
                  <>
                    {/* 1. CI/CD KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Pipeline Success
                            </p>
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-green-700">
                              {cicd.summary.total_runs > 0
                                ? (
                                    (cicd.summary.success /
                                      cicd.summary.total_runs) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on {cicd.summary.total_runs} runs
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Mean Time To Recovery
                            </p>
                            <Activity className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-blue-700">
                              {cicd.summary.mttr_min ?? "N/A"}
                              {cicd.summary.mttr_min && (
                                <span className="text-xl">m</span>
                              )}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg time to fix a broken build
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Deploy Frequency
                            </p>
                            <Zap className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-purple-700">
                              {cicd.summary.deploy_frequency_per_day}
                              <span className="text-xl">/day</span>
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Successful default branch builds
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Avg Queue vs Exec
                            </p>
                            <Timer className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-orange-700">
                              {cicd.queue_vs_execution.avg_queue_min ?? "0"}m{" "}
                              <span className="text-xl font-normal text-muted-foreground">
                                wait
                              </span>
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            vs {cicd.queue_vs_execution.avg_exec_min ?? "0"}m
                            execution time
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 2. Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Chart A: Success Rate Over Time */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Build Stability</CardTitle>
                          <CardDescription>
                            Daily pipeline success rate percentage.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                          {cicd.success_rate_over_time.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={cicd.success_rate_over_time}
                                margin={{
                                  top: 10,
                                  right: 10,
                                  left: -20,
                                  bottom: 0,
                                }}
                              >
                                <defs>
                                  <linearGradient
                                    id="colorSuccess"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop
                                      offset="5%"
                                      stopColor="#22c55e"
                                      stopOpacity={0.3}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor="#22c55e"
                                      stopOpacity={0}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(val) => val.slice(5)}
                                  axisLine={false}
                                  tickLine={false}
                                  fontSize={12}
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  domain={[0, 100]}
                                  fontSize={12}
                                />
                                <RechartsTooltip />
                                <Area
                                  type="monotone"
                                  dataKey="success_rate"
                                  name="Success Rate %"
                                  stroke="#22c55e"
                                  strokeWidth={3}
                                  fillOpacity={1}
                                  fill="url(#colorSuccess)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                              No recent pipeline data available.
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Chart B: Queue vs Execution (Stacked Bar) */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Queue vs Execution Time</CardTitle>
                          <CardDescription>
                            Time spent waiting for a runner vs actual job
                            execution.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                          {cicd.queue_vs_execution.runs.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={cicd.queue_vs_execution.runs}
                                margin={{
                                  top: 10,
                                  right: 10,
                                  left: -20,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="run_id"
                                  tickFormatter={(val) =>
                                    `#${val.toString().slice(-4)}`
                                  }
                                  axisLine={false}
                                  tickLine={false}
                                  fontSize={12}
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  fontSize={12}
                                />
                                <RechartsTooltip
                                  labelFormatter={(label) => `Run ID: ${label}`}
                                />
                                {/* Wait time is yellow/orange, Execution is blue */}
                                <Bar
                                  dataKey="queue_min"
                                  name="Queue Time (m)"
                                  stackId="a"
                                  fill="#f59e0b"
                                  radius={[0, 0, 4, 4]}
                                />
                                <Bar
                                  dataKey="exec_min"
                                  name="Execution Time (m)"
                                  stackId="a"
                                  fill="#3b82f6"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                              No detailed job telemetry available.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* 3. Actionable Tables Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Slowest Jobs Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-orange-600 flex items-center gap-2">
                            <Timer className="h-5 w-5" /> Pipeline Bottlenecks
                          </CardTitle>
                          <CardDescription>
                            The top 5 slowest individual CI jobs.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {cicd.slowest_jobs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No slow jobs detected.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {cicd.slowest_jobs.slice(0, 5).map((job, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-md border"
                                >
                                  <span
                                    className="font-medium truncate mr-2"
                                    title={job.job_name}
                                  >
                                    {job.job_name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="whitespace-nowrap bg-orange-50 text-orange-700 border-orange-200"
                                  >
                                    {job.duration_min} min
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Flaky Workflows Table */}
                      <Card
                        className={
                          cicd.flaky_workflows.length > 0
                            ? "border-red-100"
                            : ""
                        }
                      >
                        <CardHeader>
                          <CardTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Flaky
                            Workflows
                          </CardTitle>
                          <CardDescription>
                            Workflows that failed and succeeded on the exact
                            same commit.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {cicd.flaky_workflows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No flaky tests detected! Pipelines are
                              deterministic.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {cicd.flaky_workflows
                                .slice(0, 4)
                                .map((flake, i) => (
                                  <div
                                    key={i}
                                    className="flex flex-col justify-center text-sm p-3 bg-red-50/50 rounded-md border border-red-100 gap-1"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-red-900">
                                        {flake.workflow || "CI/CD"}
                                      </span>
                                      <Badge variant="destructive">Flaky</Badge>
                                    </div>
                                    <span className="text-xs text-red-700 font-mono">
                                      Commit: {flake.head_sha.substring(0, 7)} (
                                      {flake.runs} runs)
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
  )
}