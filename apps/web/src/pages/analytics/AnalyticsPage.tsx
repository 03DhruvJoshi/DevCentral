// apps/web/src/features/gitops/GitOpsPage.tsx

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
} from "../../components/ui/card.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";

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
import { set } from "zod";

interface Repository {
  id: number;
  name: string;
  owner: string; // Needed for API call
  url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

interface SonarMetrics {
  alert_status?: string;
  bugs?: string;
  vulnerabilities?: string;
  security_hotspots?: string;
  code_smells?: string;
  coverage?: string;
  duplicated_lines_density?: string;
  security_rating?: string;
  reliability_rating?: string;
}

interface velocity {
  review_time: {
    avg_first_review_h: number | null;
    avg_merge_h: number | null;
    prs: {
      number: number;
      title: string;
      time_to_first_review_h: number | null;
      time_to_merge_h: number;
    }[];
  };
  pr_size_distribution: {
    XS: number;
    S: number;
    M: number;
    L: number;
    XL: number;
  };
  stale_prs: { number: number; title: string; days_stale: number }[];
  merge_conflicts: { number: number; title: string }[];
}

interface CICD {
  summary: {
    total_runs: number;
    success: number;
    failure: number;
    avg_duration_min: number | null;
    deploy_frequency_per_day: number;
    mttr_min: number | null;
  };
  success_rate_over_time: {
    date: string;
    success: number;
    failure: number;
    total: number;
    success_rate: number;
  }[];
  flaky_workflows: { head_sha: string; runs: number; workflow: string }[];
  slowest_jobs: {
    run_id: number;
    job_name: string;
    status: string;
    duration_min: number | null;
  }[];
  queue_vs_execution: {
    avg_queue_min: number | null;
    avg_exec_min: number | null;
    runs: {
      run_id: number;
      workflow: string;
      queue_min: number;
      exec_min: number;
    }[];
  };
  deploy_days: number;
}

// Helper to convert Sonar's 1.0-5.0 ratings to A-E letters
const getRatingLetter = (val?: string) => {
  const map: Record<string, string> = {
    "1.0": "A",
    "2.0": "B",
    "3.0": "C",
    "4.0": "D",
    "5.0": "E",
  };
  return val && map[val] ? map[val] : "N/A";
};

const getRatingColor = (letter: string) => {
  if (letter === "A") return "text-green-500";
  if (letter === "B" || letter === "C") return "text-yellow-500";
  return "text-red-500";
};

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function AnalyticsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const [isReposLoading, setIsReposLoading] = useState(true);

  const [metrics, setMetrics] = useState<SonarMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [velocity, setVelocity] = useState<velocity | null>(null);
  const [isVelocityLoading, setIsVelocityLoading] = useState(false);
  const [velocityError, setVelocityError] = useState<string | null>(null);

  const [cicd, setCicd] = useState<CICD | null>(null);
  const [isCicdLoading, setIsCicdLoading] = useState(false);
  const [cicdError, setCicdError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/github/repos`);
        if (!res.ok) throw new Error("Failed to fetch repos");
        const data = await res.json();
        setRepos(data);

        // Default to the first repo if available
        if (data.length > 0) {
          setSelectedRepo(data[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsReposLoading(false);
      }
    }
    fetchRepos();
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchSonarMetrics() {
      setIsLoading(true);
      setError(null);
      setMetrics(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/analytics/sonar/${selectedRepo?.owner}/${selectedRepo?.name}`,
        );
        if (!res.ok) {
          if (res.status === 404)
            throw new Error("Repository not analyzed by SonarQube yet.");
          throw new Error("Failed to fetch SonarQube data.");
        }
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSonarMetrics();
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchVelocity() {
      setVelocity(null);
      setVelocityError(null);
      setIsVelocityLoading(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/analytics/velocity/${selectedRepo?.owner}/${selectedRepo?.name}`,
        );
        if (!res.ok) throw new Error("Failed to fetch velocity metrics");
        const data = await res.json();
        setVelocity(data);
      } catch (err) {
        setVelocityError(
          "Failed to fetch developer quality and velocity metrics",
        );
        console.error("Velocity Fetch Error:", err);
      } finally {
        setIsVelocityLoading(false);
      }
    }
    fetchVelocity();
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchCicd() {
      setCicd(null);
      setCicdError(null);
      setIsCicdLoading(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/analytics/cicd/${selectedRepo?.owner}/${selectedRepo?.name}`,
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
  }, [selectedRepo]);

  // Chart 1: Issue Breakdown (Bar Chart)
  const issueData = metrics
    ? [
        { name: "Bugs", count: parseInt(metrics.bugs || "0"), fill: "#ef4444" }, // Red
        {
          name: "Vulnerabilities",
          count: parseInt(metrics.vulnerabilities || "0"),
          fill: "#f97316",
        }, // Orange
        {
          name: "Code Smells",
          count: parseInt(metrics.code_smells || "0"),
          fill: "#eab308",
        }, // Yellow
      ]
    : [];

  // Chart 2: Code Coverage (Donut Chart)
  const coverageValue = parseFloat(metrics?.coverage || "0");
  const coverageData = [
    { name: "Covered", value: coverageValue, fill: "#22c55e" }, // Green
    { name: "Uncovered", value: 100 - coverageValue, fill: "#f1f5f9" }, // Slate/Gray
  ];

  const handleRepoChange = (repoId: string) => {
    const repo = repos.find((r) => r.id.toString() === repoId);
    if (repo) setSelectedRepo(repo);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Developer Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            DORA metrics and team performance indicators.
          </p>
        </div>

        {/* Connection Badge */}
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3 border-green-200 bg-green-50 text-green-700"
        >
          <Github className="h-4 w-4" />
          <span className="font-medium">GitHub Connected</span>
          <span className="h-2 w-2 rounded-full ml-1 bg-green-500 animate-pulse" />
        </Badge>
      </div>

      {/* REPO SELECTOR DROPDOWN */}
      <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-lg border">
        <label className="text-sm font-medium text-muted-foreground">
          Select Active Repository
        </label>
        <div className="flex items-center gap-4">
          <Select disabled={isReposLoading} onValueChange={handleRepoChange}>
            <SelectTrigger className="w-[300px] bg-white">
              <SelectValue
                placeholder={
                  isReposLoading ? "Loading repos..." : "Select a repository"
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {repos.map((repo) => (
                <SelectItem key={repo.id} value={repo.id.toString()}>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span>{repo.name}</span>
                    {repo.private && (
                      <Lock className="h-3 w-3 text-muted-foreground opacity-50" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Optional: View on GitHub Button for currently selected repo */}
          {selectedRepo && (
            <Button variant="ghost" size="sm" asChild>
              <a href={selectedRepo.url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          )}
        </div>
      </div>

      {selectedRepo ? (
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-auto max-w-xlg grid-cols-4">
            <TabsTrigger value="security">Security Metrics</TabsTrigger>
            <TabsTrigger value="velocity">
              Quality & Velocity Metrics
            </TabsTrigger>
            <TabsTrigger value="cicd">CI / CD Quality Metrics</TabsTrigger>
            <TabsTrigger value="deployment">Deployment Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                  Security Metrics
                </CardTitle>
                <CardDescription>
                  Showing recent security metrics for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p>Analyzing static code metrics from SonarQube...</p>
                  </div>
                ) : error ? (
                  <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                    <Search className="h-10 w-10 mb-2 opacity-20" />
                    <p className="font-medium">{error}</p>
                    <p className="text-sm mt-1">
                      Ensure the repository exists and has been analyzed in
                      SonarCloud.
                    </p>
                  </div>
                ) : metrics ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Row 1: High-Level KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Quality Gate Card */}
                      <Card
                        className={
                          metrics.alert_status === "OK"
                            ? "border-green-200 bg-green-50/50"
                            : "border-red-200 bg-red-50/50"
                        }
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Quality Gate
                            </p>
                            {metrics.alert_status === "OK" ? (
                              <ShieldCheck className="h-5 w-5 text-green-600" />
                            ) : (
                              <ShieldAlert className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3
                              className={`text-3xl font-bold ${metrics.alert_status === "OK" ? "text-green-700" : "text-red-700"}`}
                            >
                              {metrics.alert_status === "OK"
                                ? "PASSED"
                                : "FAILED"}
                            </h3>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Reliability (Bugs)
                            </p>
                            <Bug className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="flex items-baseline gap-3">
                            <h3 className="text-3xl font-bold">
                              {metrics.bugs || "0"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-lg font-bold ${getRatingColor(getRatingLetter(metrics.reliability_rating))}`}
                            >
                              {getRatingLetter(metrics.reliability_rating)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Security (Vulns)
                            </p>
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex items-baseline gap-3">
                            <h3 className="text-3xl font-bold">
                              {metrics.vulnerabilities || "0"}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-lg font-bold ${getRatingColor(getRatingLetter(metrics.security_rating))}`}
                            >
                              {getRatingLetter(metrics.security_rating)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Duplications
                            </p>
                            <Code className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold">
                              {metrics.duplicated_lines_density || "0"}%
                            </h3>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 2: Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: Issues Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Issue Distribution</CardTitle>
                          <CardDescription>
                            Breakdown of maintainability, reliability, and
                            security issues.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={issueData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: -20,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis axisLine={false} tickLine={false} />
                              <RechartsTooltip
                                cursor={{ fill: "transparent" }}
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {issueData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Chart 2: Test Coverage */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Unit Test Coverage</CardTitle>
                          <CardDescription>
                            Percentage of code covered by automated tests.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={coverageData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {coverageData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value) => `${value}%`}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          {/* Center Text in Donut */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-bold">
                              {metrics.coverage || "0"}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Coverage
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="velocity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                  Quality and Velocity Metrics
                </CardTitle>
                <CardDescription>
                  Showing recent quality and velocity metrics for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isVelocityLoading ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p>Analyzing quality and velocity metrics...</p>
                  </div>
                ) : velocityError ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-4 text-destructive" />
                    <p className="text-destructive">{velocityError}</p>
                  </div>
                ) : velocity ? (
                  <>
                    {/* 1. Velocity KPIs */}
                    <div className="lg:grid-cols-4 gap-4 mb-6 grid-cols-1 grid">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Time to First Review
                            </p>
                            <Clock className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-blue-700">
                              {velocity.review_time.avg_first_review_h ?? "N/A"}
                              <span className="text-xl">h</span>
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Average wait time
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Time to Merge
                            </p>
                            <GitMerge className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-purple-700">
                              {velocity.review_time.avg_merge_h ?? "N/A"}
                              <span className="text-xl">h</span>
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Open to merged
                          </p>
                        </CardContent>
                      </Card>

                      <Card
                        className={
                          velocity.merge_conflicts.length > 0
                            ? "border-red-200 bg-red-50/50"
                            : ""
                        }
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Merge Conflicts
                            </p>
                            <AlertOctagon
                              className={`h-5 w-5 ${velocity.merge_conflicts.length > 0 ? "text-red-500" : "text-green-500"}`}
                            />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3
                              className={`text-3xl font-bold ${velocity.merge_conflicts.length > 0 ? "text-red-700" : ""}`}
                            >
                              {velocity.merge_conflicts.length}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            PRs blocked by conflicts
                          </p>
                        </CardContent>
                      </Card>

                      <Card
                        className={
                          velocity.stale_prs.length > 0
                            ? "border-amber-200 bg-amber-50/50"
                            : ""
                        }
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Stale PRs
                            </p>
                            <Ghost
                              className={`h-5 w-5 ${velocity.stale_prs.length > 0 ? "text-amber-500" : "text-slate-500"}`}
                            />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3
                              className={`text-3xl font-bold ${velocity.stale_prs.length > 0 ? "text-amber-700" : ""}`}
                            >
                              {velocity.stale_prs.length}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Inactive &gt; 14 days
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 2. Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Chart A: PR Size Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle>PR Size Distribution</CardTitle>
                          <CardDescription>
                            Large PRs increase review time and bug risk.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(
                                velocity.pr_size_distribution,
                              ).map(([size, count]) => ({ size, count }))}
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
                                dataKey="size"
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <RechartsTooltip
                                cursor={{ fill: "transparent" }}
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {Object.entries(
                                  velocity.pr_size_distribution,
                                ).map(([size, _], index) => {
                                  // Color code sizes: XS/S = Green, M = Yellow, L/XL = Red
                                  const fill =
                                    size === "L" || size === "XL"
                                      ? "#ef4444"
                                      : size === "M"
                                        ? "#eab308"
                                        : "#22c55e";
                                  return (
                                    <Cell key={`cell-${index}`} fill={fill} />
                                  );
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Chart B: Review vs Merge Time per PR */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Review Bottlenecks</CardTitle>
                          <CardDescription>
                            Time to First Review vs Total Time to Merge (Recent
                            PRs).
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                          {velocity.review_time.prs.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={velocity.review_time.prs
                                  .slice()
                                  .reverse()}
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
                                  dataKey="number"
                                  tickFormatter={(val) => `#${val}`}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis axisLine={false} tickLine={false} />
                                <RechartsTooltip
                                  labelFormatter={(label) => `PR #${label}`}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="time_to_merge_h"
                                  name="Total Merge Time (h)"
                                  stroke="#a855f7"
                                  fillOpacity={0.2}
                                  fill="#a855f7"
                                />
                                <Area
                                  type="monotone"
                                  dataKey="time_to_first_review_h"
                                  name="Time to First Review (h)"
                                  stroke="#3b82f6"
                                  fillOpacity={0.6}
                                  fill="#3b82f6"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                              Not enough data to map review times.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cicd" className="mt-6">
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
                              {cicd.flaky_workflows.slice(0, 4).map((flake, i) => (
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
          </TabsContent>

          <TabsContent value="deployment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                  Deployment Metrics
                </CardTitle>
                <CardDescription>
                  Showing recent deployment metrics for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                    <p>Analyzing deployment metrics...</p>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                    <Search className="h-10 w-10 mb-2 opacity-20" />
                    <p className="font-medium">
                      No deployment metrics available
                    </p>
                    <p className="text-sm mt-1">
                      Ensure the repository has recent deployment activity and
                      is properly integrated.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-20" />
          No repository selected. Please select a repository to view analytics.
        </div>
      )}
    </div>
  );
}
