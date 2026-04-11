import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  AlertTriangle,
  Clock,
  GitMerge,
  AlertOctagon,
  Ghost,
  Activity,
  Users,
  ExternalLink,
  Filter,
  GitBranch,
  ShieldAlert,
  Search,
  TrendingUp,
  CircleDashed,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs.js";

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
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "./types.js";
import type { Repository } from "./types.js";

// Expanded Interface based on new backend
type RiskLevel = "low" | "medium" | "high";
type RegisterSortField =
  | "number"
  | "state"
  | "risk"
  | "branch"
  | "size"
  | "reviews"
  | "age";
type SortDirection = "asc" | "desc";

type ReviewStat = {
  number: number;
  title: string;
  url: string;
  author: string | null;
  base_branch: string;
  head_branch: string;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  comments: number;
  review_comments: number;
  review_count: number;
  approvals: number;
  created_at: string;
  merged_at: string;
  time_to_first_review_h: number | null;
  time_to_merge_h: number;
};

type RegisterRow = {
  number: number;
  title: string;
  url: string;
  author: string | null;
  state: string;
  is_draft: boolean;
  base_branch: string;
  head_branch: string;
  created_at: string;
  updated_at: string;
  age_days: number;
  additions: number;
  deletions: number;
  total_changes: number;
  changed_files: number;
  commits: number;
  comments: number;
  review_comments: number;
  review_count: number;
  approvals: number;
  time_to_first_review_h: number | null;
  time_to_merge_h: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  stale_days: number;
};

export interface Velocity {
  timeframe_days: number;
  summary?: {
    open_prs: number;
    merged_prs: number;
    closed_unmerged_prs: number;
    review_coverage_pct: number;
    avg_pr_changes: number | null;
    median_first_review_h: number | null;
    median_merge_h: number | null;
  };
  review_time: {
    avg_first_review_h: number | null;
    avg_merge_h: number | null;
    prs: ReviewStat[];
  };
  throughput: { date: string; count: number }[];
  top_reviewers: { username: string; count: number }[];
  reviewer_approvals?: { username: string; count: number }[];
  pr_size_distribution: Record<string, number>;
  branch_activity?: { branch: string; prs: number }[];
  branch_merge_stats?: {
    branch: string;
    merged_prs: number;
    avg_review_h: number | null;
    avg_merge_h: number | null;
  }[];
  active_branch_load?: { branch: string; open_prs: number }[];
  review_response_buckets?: { label: string; count: number }[];
  lead_time_buckets?: { label: string; count: number }[];
  quality_signals?: {
    unreviewed_merged_count: number;
    high_rework_merged_count: number;
    review_sla_breaches: number;
    long_lived_open_prs: number;
    draft_open_prs: number;
  };
  risk_prs?: RegisterRow[];
  pr_register?: RegisterRow[];
  stale_prs: {
    number: number;
    title: string;
    url: string;
    author?: string | null;
    days_stale: number;
  }[];
  merge_conflicts: {
    number: number;
    title: string;
    url: string;
    author?: string | null;
  }[];
}

// Formats huge hour counts into readable Days/Hours
const formatHours = (hours: number | null) => {
  if (hours === null || hours === undefined) return "N/A";
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getRiskBadgeClass = (risk: RiskLevel) => {
  if (risk === "high") return "bg-rose-100 text-rose-700 border-rose-200";
  if (risk === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
};

const getStateBadgeClass = (state: string) => {
  if (state === "merged")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (state === "open") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export default function VelocityAnalytics({
  selectedRepo,
}: Readonly<{ selectedRepo: Repository }>) {
  const navigate = useNavigate();
  const [velocity, setVelocity] = useState<Velocity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<number>(30); // 7, 30, 90
  const [activeTab, setActiveTab] = useState("overview");
  const [branchFilter, setBranchFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<RegisterSortField>("risk");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [registerPage, setRegisterPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    const token = localStorage.getItem("devcentral_token");

    async function fetchVelocity() {
      setVelocity(null);
      setError(null);
      setIsLoading(true);
      try {
        if (!token) return navigate("/login", { replace: true });

        const res = await fetch(
          `${API_BASE_URL}/api/analytics/velocity/${selectedRepo.owner}/${selectedRepo.name}?days=${timeframe}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("Failed to fetch velocity metrics");
        setVelocity(await res.json());
      } catch (err) {
        console.error("Velocity analytics fetch failed:", err);
        setError(
          "Failed to fetch developer quality and velocity metrics. Check API rate limits.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchVelocity();
  }, [navigate, selectedRepo, timeframe]);

  useEffect(() => {
    setRegisterPage(1);
  }, [branchFilter, stateFilter, riskFilter, search]);

  const sizeData = useMemo(
    () =>
      velocity
        ? Object.entries(velocity.pr_size_distribution).map(
            ([size, count]) => ({
              size,
              count,
            }),
          )
        : [],
    [velocity],
  );

  const branchOptions = useMemo(() => {
    if (!velocity?.pr_register) return [];
    return Array.from(
      new Set(velocity.pr_register.map((pr) => pr.base_branch)),
    ).sort((a, b) => a.localeCompare(b));
  }, [velocity?.pr_register]);

  const filteredRegister = useMemo(() => {
    if (!velocity?.pr_register) return [];
    const q = search.trim().toLowerCase();

    const filtered = velocity.pr_register.filter((pr) => {
      if (branchFilter !== "all" && pr.base_branch !== branchFilter)
        return false;
      if (stateFilter !== "all" && pr.state !== stateFilter) return false;
      if (riskFilter !== "all" && pr.risk_level !== riskFilter) return false;
      if (!q) return true;

      return (
        pr.title.toLowerCase().includes(q) ||
        String(pr.number).includes(q) ||
        (pr.author ?? "").toLowerCase().includes(q) ||
        pr.base_branch.toLowerCase().includes(q) ||
        pr.head_branch.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      let result = 0;
      if (sortField === "number") result = a.number - b.number;
      if (sortField === "state") result = a.state.localeCompare(b.state);
      if (sortField === "risk") result = a.risk_score - b.risk_score;
      if (sortField === "branch")
        result = a.base_branch.localeCompare(b.base_branch);
      if (sortField === "size") result = a.total_changes - b.total_changes;
      if (sortField === "reviews") result = a.review_count - b.review_count;
      if (sortField === "age") result = a.age_days - b.age_days;
      return sortDirection === "asc" ? result : -result;
    });
  }, [
    velocity?.pr_register,
    branchFilter,
    stateFilter,
    riskFilter,
    search,
    sortField,
    sortDirection,
  ]);

  const ROWS_PER_PAGE = 8;
  const totalRegisterPages = Math.max(
    1,
    Math.ceil(filteredRegister.length / ROWS_PER_PAGE),
  );
  const paginatedRegister = filteredRegister.slice(
    (registerPage - 1) * ROWS_PER_PAGE,
    registerPage * ROWS_PER_PAGE,
  );

  const toggleSort = (field: RegisterSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("desc");
  };

  const renderSortIcon = (field: RegisterSortField) => {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 text-slate-400" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 text-slate-700" />
    ) : (
      <ChevronDown className="h-3 w-3 text-slate-700" />
    );
  };

  const qualitySignalData = [
    {
      key: "Unreviewed Merges",
      value: velocity?.quality_signals?.unreviewed_merged_count ?? 0,
      hint: "Merged PRs without external review",
      color: "text-rose-700",
      bg: "bg-rose-50 border-rose-200",
    },
    {
      key: "High Rework PRs",
      value: velocity?.quality_signals?.high_rework_merged_count ?? 0,
      hint: "Merged PRs with 6+ commits",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      key: "Review SLA Breaches",
      value: velocity?.quality_signals?.review_sla_breaches ?? 0,
      hint: "First review took >48h",
      color: "text-orange-700",
      bg: "bg-orange-50 border-orange-200",
    },
    {
      key: "Long-Lived Open PRs",
      value: velocity?.quality_signals?.long_lived_open_prs ?? 0,
      hint: "Open longer than 7 days",
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
  ];

  const stateBreakdown = useMemo(() => {
    if (!velocity?.pr_register) return [];
    const map = velocity.pr_register.reduce<Record<string, number>>(
      (acc, pr) => {
        acc[pr.state] = (acc[pr.state] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return [
      { name: "open", value: map.open ?? 0, color: "#3b82f6" },
      { name: "merged", value: map.merged ?? 0, color: "#10b981" },
      { name: "closed", value: map.closed ?? 0, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [velocity?.pr_register]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b bg-slate-50/50 rounded-t-xl gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Activity className="h-6 w-6 text-indigo-600" />
            Engineering Velocity & Quality
          </CardTitle>
          <CardDescription className="mt-1.5">
            Pull-request flow, review health, branch pressure, and risk exposure
            for <strong>{selectedRepo.name}</strong>.
          </CardDescription>
        </div>

        {/* Dynamic Filter */}
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
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
            <p className="font-medium text-slate-700">
              Building deep velocity insights...
            </p>
            <p className="text-sm text-slate-500">
              Correlating branches, PR health, and review bottlenecks.
            </p>
          </div>
        ) : error ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-rose-50/50 rounded-xl border border-rose-100">
            <AlertTriangle className="h-10 w-10 mb-4 text-rose-500" />
            <p className="text-rose-700 font-medium">{error}</p>
          </div>
        ) : velocity ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6 animate-in fade-in duration-500"
          >
            <TabsList className="grid w-full md:w-[640px] grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="flow">Flow & Branches</TabsTrigger>
              <TabsTrigger value="review">Review Health</TabsTrigger>
              <TabsTrigger value="deepdive">Deep Dive</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Avg Review Wait
                      </p>
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="text-3xl font-black text-blue-700 tracking-tight">
                      {formatHours(
                        velocity.summary?.median_first_review_h ??
                          velocity.review_time.avg_first_review_h,
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Median time from open to first review
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Avg Lead Time
                      </p>
                      <GitMerge className="h-5 w-5 text-purple-500" />
                    </div>
                    <h3 className="text-3xl font-black text-purple-700 tracking-tight">
                      {formatHours(
                        velocity.summary?.median_merge_h ??
                          velocity.review_time.avg_merge_h,
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Median open to merge cycle time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Review Coverage
                      </p>
                      <ShieldAlert className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-emerald-700">
                      {(velocity.summary?.review_coverage_pct ?? 0).toFixed(1)}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Merged PRs with at least one external review
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Open PRs
                      </p>
                      <CircleDashed className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-indigo-700">
                      {velocity.summary?.open_prs ?? 0}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Active in this repository
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Merged PRs
                      </p>
                      <GitMerge className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-emerald-700">
                      {velocity.summary?.merged_prs ?? 0}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Merged during selected timeframe
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Avg PR Change Volume
                      </p>
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-amber-700">
                      {Math.round(velocity.summary?.avg_pr_changes ?? 0)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Additions + deletions per merged PR
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
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
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Merges"
                            stroke="#10b981"
                            fillOpacity={0.2}
                            fill="#10b981"
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

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">PR State Mix</CardTitle>
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
                        No PR state data available.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Quality Signal Watchlist
                  </CardTitle>
                  <CardDescription>
                    Counts that indicate operational drag and code review risk.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {qualitySignalData.map((signal) => (
                    <div
                      key={signal.key}
                      className={`rounded-lg border p-4 ${signal.bg}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {signal.key}
                      </p>
                      <p className={`text-2xl font-black mt-1 ${signal.color}`}>
                        {signal.value}
                      </p>
                      <p className="text-xs mt-1 text-slate-600">
                        {signal.hint}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flow" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      PR Size Distribution
                    </CardTitle>
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
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
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

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Branch PR Activity
                    </CardTitle>
                    <CardDescription>
                      Which base branches absorb the most pull-request traffic.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    {velocity.branch_activity &&
                    velocity.branch_activity.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
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
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Bar
                            dataKey="prs"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
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

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Branch Merge Health</CardTitle>
                  <CardDescription>
                    Throughput and review/merge latency by branch.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {velocity.branch_merge_stats &&
                  velocity.branch_merge_stats.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b">
                            <th className="py-2 pr-3 font-semibold">Branch</th>
                            <th className="py-2 pr-3 font-semibold">
                              Merged PRs
                            </th>
                            <th className="py-2 pr-3 font-semibold">
                              Avg First Review
                            </th>
                            <th className="py-2 pr-3 font-semibold">
                              Avg Merge Time
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {velocity.branch_merge_stats.map((row) => (
                            <tr
                              key={row.branch}
                              className="border-b border-slate-100"
                            >
                              <td className="py-2 pr-3 font-medium text-slate-800">
                                {row.branch}
                              </td>
                              <td className="py-2 pr-3 text-slate-700">
                                {row.merged_prs}
                              </td>
                              <td className="py-2 pr-3 text-slate-700">
                                {formatHours(row.avg_review_h)}
                              </td>
                              <td className="py-2 pr-3 text-slate-700">
                                {formatHours(row.avg_merge_h)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Not enough merged PR data for branch-level trending.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Review Response Buckets
                    </CardTitle>
                    <CardDescription>
                      Time to first review grouped by response SLAs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    {velocity.review_response_buckets &&
                    velocity.review_response_buckets.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={velocity.review_response_buckets}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                            tick={{ fill: "#64748b", fontSize: 12 }}
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
                            dataKey="count"
                            name="PR Count"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={55}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Not enough data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Lead Time Buckets</CardTitle>
                    <CardDescription>
                      Distribution of open-to-merge duration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    {velocity.lead_time_buckets &&
                    velocity.lead_time_buckets.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={velocity.lead_time_buckets}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                            name="PR Count"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={55}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No lead-time distribution data available.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      PR Lifecycle by ID
                    </CardTitle>
                    <CardDescription>
                      First review latency vs total merge time for recent merged
                      PRs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[340px]">
                    {velocity.review_time.prs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={velocity.review_time.prs}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="number"
                            tickFormatter={(val) => `#${val}`}
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
                            labelFormatter={(label) => `PR #${label}`}
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Bar
                            dataKey="time_to_first_review_h"
                            name="Time to Review (h)"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Line
                            type="monotone"
                            dataKey="time_to_merge_h"
                            name="Time to Merge (h)"
                            stroke="#a855f7"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Not enough merged PRs for lifecycle analysis.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-500" /> Reviewer
                      Impact
                    </CardTitle>
                    <CardDescription>
                      Most active reviewers and approval contributors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                        Review Volume
                      </p>
                      {velocity.top_reviewers.length > 0 ? (
                        <div className="space-y-2">
                          {velocity.top_reviewers.map((reviewer) => (
                            <div
                              key={`reviewer-${reviewer.username}`}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <span className="font-medium text-slate-800">
                                @{reviewer.username}
                              </span>
                              <Badge variant="secondary" className="font-mono">
                                {reviewer.count} reviews
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No reviewer data.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                        Approval Volume
                      </p>
                      {velocity.reviewer_approvals &&
                      velocity.reviewer_approvals.length > 0 ? (
                        <div className="space-y-2">
                          {velocity.reviewer_approvals.map((reviewer) => (
                            <div
                              key={`approval-${reviewer.username}`}
                              className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                            >
                              <span className="font-medium text-slate-800">
                                @{reviewer.username}
                              </span>
                              <Badge
                                variant="outline"
                                className="font-mono border-emerald-200 text-emerald-700"
                              >
                                {reviewer.count} approvals
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No approval data.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="deepdive" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <GitBranch className="h-4 w-4 text-slate-500" />
                  <select
                    className="w-full bg-transparent text-sm outline-none text-slate-700"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    className="w-full bg-transparent text-sm outline-none text-slate-700"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                  >
                    <option value="all">All States</option>
                    <option value="open">Open</option>
                    <option value="merged">Merged</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <select
                    className="w-full bg-transparent text-sm outline-none text-slate-700"
                    value={riskFilter}
                    onChange={(e) =>
                      setRiskFilter(e.target.value as "all" | RiskLevel)
                    }
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search PR #, title, author..."
                    className="w-full bg-transparent text-sm outline-none text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-rose-200">
                  <CardHeader className="bg-rose-50/50 rounded-t-xl border-b border-rose-100">
                    <CardTitle className="text-lg text-rose-800 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" /> Highest Risk PRs
                    </CardTitle>
                    <CardDescription>
                      Ranked by size, commit churn, and review exposure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {velocity.risk_prs && velocity.risk_prs.length > 0 ? (
                      <div className="divide-y divide-rose-100 max-h-[420px] overflow-y-auto">
                        {velocity.risk_prs.slice(0, 8).map((pr) => (
                          <div
                            key={pr.number}
                            className="p-4 hover:bg-rose-50/30 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-slate-800 mb-1">
                                {pr.title}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                <span>#{pr.number}</span>
                                <span>•</span>
                                <span>@{pr.author ?? "unknown"}</span>
                                <Badge
                                  variant="outline"
                                  className={getRiskBadgeClass(pr.risk_level)}
                                >
                                  {pr.risk_level} risk ({pr.risk_score})
                                </Badge>
                                <span>{pr.total_changes} changes</span>
                              </div>
                            </div>
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-600 hover:text-rose-800 bg-rose-100 p-2 rounded-md transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        No elevated-risk PRs in this timeframe.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader className="bg-amber-50/50 rounded-t-xl border-b border-amber-100">
                    <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5" /> Merge Conflicts
                    </CardTitle>
                    <CardDescription>
                      Open PRs blocked by unresolved merge conflicts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {velocity.merge_conflicts.length > 0 ? (
                      <div className="divide-y divide-amber-100 max-h-[420px] overflow-y-auto">
                        {velocity.merge_conflicts.map((pr) => (
                          <div
                            key={pr.number}
                            className="p-4 hover:bg-amber-50/30 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-slate-800 mb-1">
                                {pr.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                #{pr.number} • @{pr.author ?? "unknown"}
                              </p>
                            </div>
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-600 hover:text-amber-800 bg-amber-100 p-2 rounded-md transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        No merge conflicts found.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Open Issue Register</CardTitle>
                  <CardDescription>
                    Detailed PR register with branch, risk, size, review depth,
                    and age.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[980px]">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("number")}
                            >
                              PR {renderSortIcon("number")}
                            </button>
                          </th>
                          <th className="py-2 pr-3 font-semibold">Title</th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("state")}
                            >
                              State {renderSortIcon("state")}
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("risk")}
                            >
                              Risk {renderSortIcon("risk")}
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("branch")}
                            >
                              Branch {renderSortIcon("branch")}
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("size")}
                            >
                              Size {renderSortIcon("size")}
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("reviews")}
                            >
                              Reviews {renderSortIcon("reviews")}
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => toggleSort("age")}
                            >
                              Age {renderSortIcon("age")}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRegister.length > 0 ? (
                          paginatedRegister.map((pr) => (
                            <tr
                              key={`register-${pr.number}`}
                              className="border-b border-slate-100 align-top"
                            >
                              <td className="py-3 pr-3 font-medium text-slate-800">
                                #{pr.number}
                              </td>
                              <td className="py-3 pr-3">
                                <div className="max-w-[320px]">
                                  <p className="font-medium text-slate-800 line-clamp-2">
                                    {pr.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>@{pr.author ?? "unknown"}</span>
                                    <span>•</span>
                                    <a
                                      href={pr.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                                    >
                                      Open <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-3">
                                <Badge
                                  variant="outline"
                                  className={getStateBadgeClass(pr.state)}
                                >
                                  {pr.state}
                                </Badge>
                              </td>
                              <td className="py-3 pr-3">
                                <Badge
                                  variant="outline"
                                  className={getRiskBadgeClass(pr.risk_level)}
                                >
                                  {pr.risk_level} ({pr.risk_score})
                                </Badge>
                              </td>
                              <td className="py-3 pr-3 text-slate-700">
                                {pr.base_branch}
                              </td>
                              <td className="py-3 pr-3 text-slate-700">
                                {pr.total_changes}
                              </td>
                              <td className="py-3 pr-3 text-slate-700">
                                {pr.review_count} ({pr.approvals} approvals)
                              </td>
                              <td className="py-3 pr-3 text-slate-700">
                                {pr.age_days}d
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No PRs match the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      Showing {paginatedRegister.length} of{" "}
                      {filteredRegister.length} PRs
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
                        Page {registerPage} / {totalRegisterPages}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded border text-slate-700 disabled:opacity-40"
                        onClick={() =>
                          setRegisterPage((p) =>
                            Math.min(totalRegisterPages, p + 1),
                          )
                        }
                        disabled={registerPage >= totalRegisterPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-amber-200">
                  <CardHeader className="bg-amber-50/50 rounded-t-xl border-b border-amber-100">
                    <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
                      <Ghost className="h-5 w-5" /> Stale Pull Requests
                    </CardTitle>
                    <CardDescription>
                      Open PRs untouched for more than 14 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {velocity.stale_prs.length > 0 ? (
                      <div className="divide-y divide-amber-100 max-h-[360px] overflow-y-auto">
                        {velocity.stale_prs.map((pr) => (
                          <div
                            key={`stale-${pr.number}`}
                            className="p-4 hover:bg-amber-50/30 transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-slate-800 mb-1">
                                {pr.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  #{pr.number} • @{pr.author ?? "unknown"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-amber-100 text-amber-800 border-transparent text-[10px] py-0"
                                >
                                  {pr.days_stale} days stale
                                </Badge>
                              </div>
                            </div>
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-600 hover:text-amber-800 bg-amber-100 p-2 rounded-md transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        No stale pull requests found.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Open PR Pressure by Branch
                    </CardTitle>
                    <CardDescription>
                      Branches accumulating unresolved PR load.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    {velocity.active_branch_load &&
                    velocity.active_branch_load.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={velocity.active_branch_load}
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
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Bar
                            dataKey="open_prs"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No open branch pressure data available.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
}
