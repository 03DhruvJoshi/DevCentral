import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  AlertTriangle,
  Activity,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart3,
  GitBranch,
  ShieldCheck,
  ScanSearch,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs.js";
import { Button } from "../../../../components/ui/button.js";

import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../types.js";
import type { Repository } from "../types.js";

import type {
  RiskLevel,
  RegisterSortField,
  SortDirection,
  VelocityApiResponse,
  Velocity,
} from "./types.js";

import OverviewTab from "./tabs/OverviewTab.js";
import FlowTab from "./tabs/FlowTab.js";
import ReviewTab from "./tabs/ReviewTab.js";
import DeepDiveTab from "./tabs/DeepdiveTab.js";
import ActivityLogTab from "./tabs/ActivityLogTab.js";

import { formatHours, formatShortDate } from "./utlities.js";

export default function VelocityAnalytics({
  selectedRepo,
}: {
  readonly selectedRepo: Repository;
}) {
  const navigate = useNavigate();
  const [velocity, setVelocity] = useState<Velocity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [refreshKey, setRefreshKey] = useState(0);
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
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!res.ok) throw new Error("Failed to fetch velocity metrics");

        const payload = (await res.json()) as VelocityApiResponse;
        setVelocity({
          ...payload,
          review_time: {
            avg_first_review_h: payload.review_time?.avg_first_review_h ?? null,
            avg_merge_h: payload.review_time?.avg_merge_h ?? null,
            prs: payload.review_time?.prs ?? [],
          },
        });
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
  }, [navigate, selectedRepo, timeframe, refreshKey]);

  useEffect(() => {
    setRegisterPage(1);
  }, [branchFilter, stateFilter, riskFilter, search]);

  const sizeData = useMemo(
    () =>
      velocity
        ? Object.entries(velocity.pr_size_distribution).map(
            ([size, count]) => ({ size, count }),
          )
        : [],
    [velocity],
  );

  const reviewLifecyclePrs = useMemo(
    () => velocity?.review_time?.prs ?? [],
    [velocity?.review_time?.prs],
  );

  const branchOptions = useMemo(() => {
    if (!velocity?.pr_register) return [];
    return Array.from(
      new Set(velocity.pr_register.map((pr: any) => pr.base_branch)),
    ).sort((a, b) => a.localeCompare(b));
  }, [velocity?.pr_register]);

  const filteredRegister = useMemo(() => {
    if (!velocity?.pr_register) return [];
    const q = search.trim().toLowerCase();

    const filtered = velocity.pr_register.filter((pr: any) => {
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

    return filtered.sort((a: any, b: any) => {
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
      (acc: any, pr: any) => {
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

  const tabItems = [
    {
      value: "overview",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      label: "Overview",
    },
    {
      value: "flow",
      icon: <GitBranch className="h-3.5 w-3.5" />,
      label: "Flow & Branches",
    },
    {
      value: "review",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      label: "Review Health",
    },
    {
      value: "deepdive",
      icon: <ScanSearch className="h-3.5 w-3.5" />,
      label: "Deep Dive",
    },
    {
      value: "activitylog",
      icon: <Activity className="h-3.5 w-3.5" />,
      label: "Activity Log",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(99,102,241,0.07),transparent)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 ring-1 ring-indigo-500/20 shadow-sm">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Engineering Velocity & Quality
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Pull-request flow, review health, branch pressure, and risk
                exposure for{" "}
                <strong className="text-slate-700">{selectedRepo.name}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="gap-1.5 shrink-0 border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="h-[500px] flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-600" />
          <p className="font-medium text-slate-700">
            Building deep velocity insights...
          </p>
          <p className="text-sm text-slate-500">
            Correlating branches, PR health, and review bottlenecks.
          </p>
        </div>
      ) : error ? (
        <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mb-4 text-red-500" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      ) : velocity ? (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full animate-in fade-in duration-500"
        >
          <TabsList className="mb-2 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <OverviewTab
              velocity={velocity}
              stateBreakdown={stateBreakdown}
              qualitySignalData={qualitySignalData}
              formatHours={formatHours}
              formatShortDate={formatShortDate}
            />
          </TabsContent>

          <TabsContent value="flow" className="mt-4 space-y-6">
            <FlowTab
              velocity={velocity}
              sizeData={sizeData}
              formatHours={formatHours}
            />
          </TabsContent>

          <TabsContent value="review" className="mt-4 space-y-6">
            <ReviewTab
              reviewLifecyclePrs={reviewLifecyclePrs}
              velocity={velocity}
            />
          </TabsContent>

          <TabsContent value="deepdive" className="mt-4 space-y-6">
            <DeepDiveTab
              velocity={velocity}
              branchOptions={branchOptions}
              branchFilter={branchFilter}
              setBranchFilter={setBranchFilter}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              riskFilter={riskFilter}
              setRiskFilter={setRiskFilter}
              search={search}
              setSearch={setSearch}
            />
          </TabsContent>

          <TabsContent value="activitylog" className="mt-4 space-y-6">
            <ActivityLogTab
              paginatedRegister={paginatedRegister}
              filteredRegister={filteredRegister}
              toggleSort={toggleSort}
              renderSortIcon={renderSortIcon}
              registerPage={registerPage}
              setRegisterPage={setRegisterPage}
              totalRegisterPages={totalRegisterPages}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
