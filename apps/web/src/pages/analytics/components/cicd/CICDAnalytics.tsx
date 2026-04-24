import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  AlertTriangle,
  Zap,
  Filter,
  RefreshCw,
  Activity,
  Timer,
  ListFilter,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs.js";
import { Button } from "../../../../components/ui/button.js";

import { useNavigate } from "react-router-dom";
import type CICD from "./types.js";
import { conclusionColor } from "./utilities.js";
import DoraMetricsTab from "./tabs/DoraMetricsTab.js";
import PerformanceTab from "./tabs/PerformanceTab.js";
import AnalyticsLogTab from "./tabs/ActivityLogTab.js";

import { API_BASE_URL } from "../types.js";
import type { Repository } from "../types.js";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
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
  }, [navigate, selectedRepo, timeframe, refreshKey]);

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
      if (conclusionFilter !== "all" && runConclusion !== conclusionFilter)
        return false;

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

  const tabItems = [
    {
      value: "overview",
      icon: <Activity className="h-3.5 w-3.5" />,
      label: "Overview",
    },
    {
      value: "performance",
      icon: <Timer className="h-3.5 w-3.5" />,
      label: "Performance",
    },
    {
      value: "deepdive",
      icon: <ListFilter className="h-3.5 w-3.5" />,
      label: "Run Register",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(59,130,246,0.07),transparent)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 ring-1 ring-blue-500/20 shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                CI/CD Pipeline Telemetry
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Deployment stability, speed, and reliability metrics for{" "}
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
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
          <p className="font-medium text-slate-700">
            Aggregating workflow payloads...
          </p>
          <p className="text-sm text-slate-500">
            Calculating execution versus queue times.
          </p>
        </div>
      ) : error ? (
        <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mb-4 text-red-500" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      ) : cicd ? (
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
            <DoraMetricsTab
              cicd={cicd}
              conclusionChartData={conclusionChartData}
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-6">
            <PerformanceTab cicd={cicd} />
          </TabsContent>

          <TabsContent value="deepdive" className="mt-4 space-y-6">
            <AnalyticsLogTab
              filteredRegister={filteredRegister}
              workflowOptions={workflowOptions}
              branchOptions={branchOptions}
              conclusionOptions={conclusionOptions}
              workflowFilter={workflowFilter}
              setWorkflowFilter={setWorkflowFilter}
              branchFilter={branchFilter}
              setBranchFilter={setBranchFilter}
              conclusionFilter={conclusionFilter}
              setConclusionFilter={setConclusionFilter}
              search={search}
              setSearch={setSearch}
              pagedRegister={pagedRegister}
              registerPage={registerPage}
              setRegisterPage={setRegisterPage}
              totalPages={totalPages}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
