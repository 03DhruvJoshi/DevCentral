import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Search,
  Timer,
  Zap,
  Activity,
  Filter,
  ServerCrash,
  ExternalLink,
  Clock,
  GitBranch,
  ListFilter,
  CircleDashed,
} from "lucide-react";
import { Button } from "../../../components/ui/button.js";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "./types.js";
import type { Repository } from "./types.js";

export interface CICD {
  timeframe_days: number;
  summary: {
    total_runs: number;
    success: number;
    failure: number;
    change_failure_rate: number;
    avg_duration_min: number | null;
    deploy_frequency_per_day: number;
    mttr_min: number | null;
    queue_sla_breach_count?: number;
    long_running_count?: number;
    flaky_commit_count?: number;
  };
  success_rate_over_time: {
    date: string;
    total: number;
    success_rate: number;
  }[];
  flaky_workflows: {
    head_sha: string;
    runs: number;
    workflow?: string;
    url?: string;
  }[];
  slowest_jobs: {
    run_id: number;
    workflow: string;
    branch: string;
    job_name: string;
    status: string | null;
    url: string;
    duration_min: number | null;
  }[];
  queue_vs_execution: {
    avg_queue_min: number | null;
    avg_exec_min: number | null;
    runs: {
      run_id: number;
      workflow: string;
      queue_min: number | null;
      exec_min: number | null;
    }[];
  };
  workflow_breakdown?: {
    workflow: string;
    total_runs: number;
    success_rate: number;
    failure_rate: number;
    avg_duration_min: number | null;
    avg_queue_min: number | null;
    last_run_at: string;
  }[];
  branch_breakdown?: {
    branch: string;
    total_runs: number;
    success_rate: number;
    failure_rate: number;
    avg_duration_min: number | null;
  }[];
  conclusion_breakdown?: {
    conclusion: string;
    count: number;
  }[];
  failure_reasons?: {
    conclusion: string;
    count: number;
  }[];
  run_register?: {
    run_id: number;
    workflow: string;
    branch: string;
    event: string;
    status: string;
    conclusion: string | null;
    actor: string | null;
    queue_min: number | null;
    exec_min: number | null;
    duration_min: number | null;
    created_at: string;
    updated_at: string;
    url: string;
  }[];
}

// Helper to convert minutes into human-readable hours/minutes
const formatDuration = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return "N/A";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const conclusionColor = (value: string) => {
  if (value === "success") return "#10b981";
  if (value === "failure") return "#ef4444";
  if (value === "timed_out") return "#f97316";
  if (value === "cancelled") return "#64748b";
  return "#94a3b8";
};

export default function CICDAnalytics({
  selectedRepo,
}: Readonly<{
  selectedRepo: Repository;
}>) {
  const navigate = useNavigate();
  const [cicd, setCicd] = useState<CICD | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [conclusionFilter, setConclusionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [registerPage, setRegisterPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    const token = localStorage.getItem("devcentral_token");

    async function fetchCicd() {
      setCicd(null);
      setError(null);
      setIsLoading(true);
      try {
        if (!token) return navigate("/login", { replace: true });

        const res = await fetch(
          `${API_BASE_URL}/api/analytics/cicd/${selectedRepo.owner}/${selectedRepo.name}?days=${timeframe}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to fetch CI/CD metrics.");
        setCicd(await res.json());
      } catch (err) {
        console.error("CICD analytics fetch failed", err);
        setError("Failed to fetch CI/CD pipelines telemetry.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCicd();
  }, [navigate, selectedRepo, timeframe]);

  useEffect(() => {
    setRegisterPage(1);
  }, [workflowFilter, branchFilter, conclusionFilter, search]);

  const workflowOptions = useMemo(() => {
    if (!cicd?.run_register) return [];
    return Array.from(
      new Set(cicd.run_register.map((run) => run.workflow)),
    ).sort((a, b) => a.localeCompare(b));
  }, [cicd?.run_register]);

  const branchOptions = useMemo(() => {
    if (!cicd?.run_register) return [];
    return Array.from(new Set(cicd.run_register.map((run) => run.branch))).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [cicd?.run_register]);

  const conclusionOptions = useMemo(() => {
    if (!cicd?.run_register) return [];
    return Array.from(
      new Set(cicd.run_register.map((run) => run.conclusion ?? "in_progress")),
    ).sort((a, b) => a.localeCompare(b));
  }, [cicd?.run_register]);

  const filteredRegister = useMemo(() => {
    if (!cicd?.run_register) return [];
    const q = search.trim().toLowerCase();

    return cicd.run_register.filter((run) => {
      if (workflowFilter !== "all" && run.workflow !== workflowFilter)
        return false;
      if (branchFilter !== "all" && run.branch !== branchFilter) return false;

      const runConclusion = run.conclusion ?? "in_progress";
      if (conclusionFilter !== "all" && runConclusion !== conclusionFilter) {
        return false;
      }

      if (!q) return true;

      return (
        String(run.run_id).includes(q) ||
        run.workflow.toLowerCase().includes(q) ||
        run.branch.toLowerCase().includes(q) ||
        (run.actor ?? "").toLowerCase().includes(q) ||
        (run.event ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    cicd?.run_register,
    workflowFilter,
    branchFilter,
    conclusionFilter,
    search,
  ]);

  const RUNS_PER_PAGE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRegister.length / RUNS_PER_PAGE),
  );
  const pagedRegister = filteredRegister.slice(
    (registerPage - 1) * RUNS_PER_PAGE,
    registerPage * RUNS_PER_PAGE,
  );

  const conclusionChartData = (cicd?.conclusion_breakdown ?? []).map(
    (item) => ({
      ...item,
      color: conclusionColor(item.conclusion),
    }),
  );

  const failureReasonData = cicd?.failure_reasons ?? [];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b bg-slate-50/50 rounded-t-xl gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Zap className="h-6 w-6 text-blue-600" />
            CI/CD Pipeline Telemetry
          </CardTitle>
          <CardDescription className="mt-1.5">
            Deployment stability, speed, and reliability metrics for{" "}
            <strong>{selectedRepo.name}</strong>.
          </CardDescription>
        </div>

        {/* Actionable Timeframe Filter */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="bg-transparent text-sm font-medium outline-none text-slate-700 cursor-pointer"
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
            <p className="font-medium text-slate-700">
              Aggregating workflow payloads...
            </p>
            <p className="text-sm text-slate-500">
              Calculating execution versus queue times.
            </p>
          </div>
        ) : error ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-rose-50/50 rounded-xl border border-rose-100">
            <AlertTriangle className="h-10 w-10 mb-4 text-rose-500" />
            <p className="text-rose-700 font-medium">{error}</p>
          </div>
        ) : cicd ? (
          <Tabs
            defaultValue="overview"
            className="space-y-6 animate-in fade-in duration-500"
          >
            <TabsList className="grid w-full md:w-[760px] grid-cols-4">
              <TabsTrigger value="overview">DORA Metrics</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="reliability">Reliability</TabsTrigger>
              <TabsTrigger value="deepdive">Deep Dive</TabsTrigger>
            </TabsList>

            {/* --- TAB 1: OVERVIEW & DORA METRICS --- */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pipeline Success */}
                <Card
                  className={
                    cicd.summary.change_failure_rate > 20
                      ? "border-rose-200 bg-rose-50/30"
                      : "border-emerald-200 bg-emerald-50/30"
                  }
                >
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Pipeline Success
                      </p>
                      <ShieldCheck
                        className={`h-5 w-5 ${cicd.summary.change_failure_rate > 20 ? "text-rose-500" : "text-emerald-500"}`}
                      />
                    </div>
                    <h3
                      className={`text-3xl font-black tracking-tight ${cicd.summary.change_failure_rate > 20 ? "text-rose-700" : "text-emerald-700"}`}
                    >
                      {cicd.summary.total_runs > 0
                        ? (
                            (cicd.summary.success / cicd.summary.total_runs) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Based on {cicd.summary.total_runs} runs
                    </p>
                  </CardContent>
                </Card>

                {/* Change Failure Rate */}
                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Change Failure Rate
                      </p>
                      <ServerCrash className="h-5 w-5 text-rose-500" />
                    </div>
                    <h3 className="text-3xl font-black text-rose-700 tracking-tight">
                      {cicd.summary.change_failure_rate}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Deployments resulting in failure
                    </p>
                  </CardContent>
                </Card>

                {/* Deployment Frequency */}
                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Deploy Frequency
                      </p>
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-black text-blue-700 tracking-tight flex items-baseline gap-1">
                      {cicd.summary.deploy_frequency_per_day}{" "}
                      <span className="text-base font-medium text-slate-500">
                        /day
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Successful default branch merges
                    </p>
                  </CardContent>
                </Card>

                {/* MTTR */}
                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        MTTR
                      </p>
                      <Clock className="h-5 w-5 text-purple-500" />
                    </div>
                    <h3 className="text-3xl font-black text-purple-700 tracking-tight">
                      {formatDuration(cicd.summary.mttr_min)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Mean Time To Recovery
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Queue SLA Breaches
                      </p>
                      <CircleDashed className="h-5 w-5 text-amber-500" />
                    </div>
                    <h3 className="text-3xl font-black text-amber-700 tracking-tight">
                      {cicd.summary.queue_sla_breach_count ?? 0}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Runs waiting over 10 minutes in queue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Long Running Runs
                      </p>
                      <Timer className="h-5 w-5 text-orange-500" />
                    </div>
                    <h3 className="text-3xl font-black text-orange-700 tracking-tight">
                      {cicd.summary.long_running_count ?? 0}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Runs executing over 20 minutes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Flaky Commit Count
                      </p>
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                    </div>
                    <h3 className="text-3xl font-black text-rose-700 tracking-tight">
                      {cicd.summary.flaky_commit_count ?? 0}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Commits with both failed and successful reruns
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Build Stability Chart */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Build Stability Trend
                    </CardTitle>
                    <CardDescription>
                      Daily pipeline success percentage and run volume trend.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    {cicd.success_rate_over_time.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={cicd.success_rate_over_time}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                                stopColor="#3b82f6"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#3b82f6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => formatDate(val)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tick={{ fill: "#64748b" }}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="success_rate"
                            name="Success Rate %"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSuccess)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No pipeline execution data found.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Run Outcome Distribution
                    </CardTitle>
                    <CardDescription>
                      Exact run conclusion split for the selected time range.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    {conclusionChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={conclusionChartData}
                            dataKey="count"
                            nameKey="conclusion"
                            fill="#3b82f6"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No outcome distribution data.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- TAB 2: PERFORMANCE --- */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Queue vs Execution */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Queue vs Execution Lag
                    </CardTitle>
                    <CardDescription>
                      Visualizing runner bottleneck delays prior to job
                      execution.
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
                            tickFormatter={(val) =>
                              `#${val.toString().slice(-4)}`
                            }
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
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
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
                <Card className="border-slate-200 flex flex-col">
                  <CardHeader className="bg-slate-50/50 rounded-t-xl border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                      <Timer className="h-5 w-5 text-orange-600" /> Critical
                      Time Bottlenecks
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
                            className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center"
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="font-semibold text-slate-800 truncate mb-1">
                                {job.job_name}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    job.status === "success"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-[10px] py-0 px-1.5 uppercase"
                                >
                                  {job.status || "Unknown"}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  Run #{job.run_id}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
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
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Workflow Breakdown
                    </CardTitle>
                    <CardDescription>
                      Success, failure, queue, and duration profile by workflow.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[340px] overflow-y-auto space-y-2">
                    {(cicd.workflow_breakdown ?? []).length > 0 ? (
                      cicd.workflow_breakdown!.map((wf) => (
                        <div
                          key={wf.workflow}
                          className="rounded-md border border-slate-100 bg-slate-50 p-3"
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
                            <span>
                              Avg queue: {formatDuration(wf.avg_queue_min)}
                            </span>
                            <span>
                              Avg exec: {formatDuration(wf.avg_duration_min)}
                            </span>
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

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Branch Performance
                    </CardTitle>
                    <CardDescription>
                      Branch-level CI quality for throughput and execution
                      speed.
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
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
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
            </TabsContent>

            {/* --- TAB 3: RELIABILITY --- */}
            <TabsContent value="reliability" className="space-y-6">
              <Card
                className={
                  cicd.flaky_workflows.length > 0
                    ? "border-rose-200"
                    : "border-emerald-200"
                }
              >
                <CardHeader
                  className={
                    cicd.flaky_workflows.length > 0
                      ? "bg-rose-50/50 border-b border-rose-100"
                      : "bg-emerald-50/50 border-b border-emerald-100"
                  }
                >
                  <CardTitle
                    className={`text-lg flex items-center gap-2 ${cicd.flaky_workflows.length > 0 ? "text-rose-800" : "text-emerald-800"}`}
                  >
                    <AlertTriangle className="h-5 w-5" /> Non-Deterministic
                    Workflows (Flaky Tests)
                  </CardTitle>
                  <CardDescription>
                    Workflows that failed, then succeeded on the exact same
                    commit without code changes. These erode developer trust.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {cicd.flaky_workflows.length === 0 ? (
                    <div className="p-12 text-center text-emerald-600 font-medium flex flex-col items-center">
                      <ShieldCheck className="h-12 w-12 mb-3 opacity-50" />
                      No flaky pipelines detected! Your CI is fully
                      deterministic.
                    </div>
                  ) : (
                    <div className="divide-y divide-rose-100">
                      {cicd.flaky_workflows.map((flake) => (
                        <div
                          key={`${flake.head_sha}-${flake.workflow ?? "workflow"}`}
                          className="p-5 hover:bg-rose-50/30 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-rose-900 text-lg">
                                {flake.workflow || "Unknown Pipeline"}
                              </span>
                              <Badge
                                variant="destructive"
                                className="bg-rose-500"
                              >
                                FLAKY
                              </Badge>
                            </div>
                            <p className="text-sm text-rose-700 font-mono mt-2">
                              Commit SHA:{" "}
                              <span className="font-bold bg-rose-100 px-1 rounded">
                                {flake.head_sha.substring(0, 7)}
                              </span>{" "}
                              • Took {flake.runs} attempts to pass
                            </p>
                          </div>
                          {flake.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-rose-200 text-rose-700 hover:bg-rose-100 shrink-0"
                              asChild
                            >
                              <a
                                href={flake.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Search className="h-4 w-4 mr-2" /> Inspect Logs
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Failure Reason Mix</CardTitle>
                  <CardDescription>
                    Specific failure categories (failure, timed out, cancelled,
                    action required).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {failureReasonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={failureReasonData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="conclusion"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          tick={{ fill: "#64748b" }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Count"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No failure reason data.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- TAB 4: DEEP DIVE --- */}
            <TabsContent value="deepdive" className="space-y-6">
              <Card className="border-slate-200 bg-slate-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListFilter className="h-5 w-5 text-indigo-600" />
                    Run Register Filters
                  </CardTitle>
                  <CardDescription>
                    Filter by workflow, branch, conclusion, and free-text search
                    to isolate CI/CD issues.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 border rounded-md bg-white px-3 py-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <select
                      className="w-full bg-transparent text-sm outline-none"
                      value={workflowFilter}
                      onChange={(e) => setWorkflowFilter(e.target.value)}
                    >
                      <option value="all">All workflows</option>
                      {workflowOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 border rounded-md bg-white px-3 py-2">
                    <GitBranch className="h-4 w-4 text-slate-500" />
                    <select
                      className="w-full bg-transparent text-sm outline-none"
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                    >
                      <option value="all">All branches</option>
                      {branchOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 border rounded-md bg-white px-3 py-2">
                    <ServerCrash className="h-4 w-4 text-slate-500" />
                    <select
                      className="w-full bg-transparent text-sm outline-none"
                      value={conclusionFilter}
                      onChange={(e) => setConclusionFilter(e.target.value)}
                    >
                      <option value="all">All conclusions</option>
                      {conclusionOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 border rounded-md bg-white px-3 py-2">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Run ID, actor, event..."
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Run Register</CardTitle>
                  <CardDescription>
                    Full run-level telemetry: workflow, trigger, actor, queue
                    time, execution time, and final result.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-2 pr-3 font-semibold">Run</th>
                          <th className="py-2 pr-3 font-semibold">Workflow</th>
                          <th className="py-2 pr-3 font-semibold">Branch</th>
                          <th className="py-2 pr-3 font-semibold">Event</th>
                          <th className="py-2 pr-3 font-semibold">
                            Conclusion
                          </th>
                          <th className="py-2 pr-3 font-semibold">Queue</th>
                          <th className="py-2 pr-3 font-semibold">Exec</th>
                          <th className="py-2 pr-3 font-semibold">Actor</th>
                          <th className="py-2 pr-3 font-semibold">Started</th>
                          <th className="py-2 pr-3 font-semibold">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRegister.length > 0 ? (
                          pagedRegister.map((run) => {
                            const normalizedConclusion =
                              run.conclusion ?? "in_progress";
                            return (
                              <tr
                                key={run.run_id}
                                className="border-b border-slate-100"
                              >
                                <td className="py-2 pr-3 font-medium text-slate-800">
                                  #{run.run_id}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {run.workflow}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {run.branch}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {run.event}
                                </td>
                                <td className="py-2 pr-3">
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                    style={{
                                      borderColor:
                                        conclusionColor(normalizedConclusion),
                                      color:
                                        conclusionColor(normalizedConclusion),
                                    }}
                                  >
                                    {normalizedConclusion}
                                  </Badge>
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {formatDuration(run.queue_min)}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {formatDuration(run.exec_min)}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {run.actor ?? "-"}
                                </td>
                                <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                                  {formatDateTime(run.created_at)}
                                </td>
                                <td className="py-2 pr-3">
                                  <a
                                    href={run.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={10}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No runs match your selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Showing {pagedRegister.length} of{" "}
                      {filteredRegister.length} runs
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 rounded border text-slate-700 disabled:opacity-40"
                        onClick={() =>
                          setRegisterPage((p) => Math.max(1, p - 1))
                        }
                        disabled={registerPage <= 1}
                      >
                        Previous
                      </button>
                      <span className="text-slate-600">
                        Page {registerPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded border text-slate-700 disabled:opacity-40"
                        onClick={() =>
                          setRegisterPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={registerPage >= totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
}
