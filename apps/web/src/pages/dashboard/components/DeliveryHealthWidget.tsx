import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Gauge,
  TimerReset,
  Rocket,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { Progress } from "../../../components/ui/progress.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import { API_BASE_URL } from "../types.js";
import { useDashboardContext } from "../DashboardContext.js";

type GitHubRepo = {
  id: number;
  name: string;
  owner: string;
};

type CiCdData = {
  summary: {
    total_runs: number;
    success: number;
    failure: number;
    avg_duration_min: number | null;
    deploy_frequency_per_day: number;
    mttr_min: number | null;
  };
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function TrendIndicator({ rate }: { rate: number }) {
  if (rate >= 90)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
        <TrendingUp className="h-3.5 w-3.5" /> Strong
      </span>
    );
  if (rate < 75)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-semibold">
        <TrendingDown className="h-3.5 w-3.5" /> Needs attention
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-600 text-xs font-semibold">
      <Minus className="h-3.5 w-3.5" /> Stable
    </span>
  );
}

export function DeliveryHealthWidget() {
  const { dateRange } = useDashboardContext();
  const days = dateRange.replace("d", "");

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [metrics, setMetrics] = useState<CiCdData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    const token = localStorage.getItem("devcentral_token");
    const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Unable to load repositories");

    const data = (await res.json()) as GitHubRepo[];
    const compact = data.slice(0, 8);
    setRepos(compact);

    if (!selectedRepo && compact[0]) {
      setSelectedRepo(`${compact[0].owner}/${compact[0].name}`);
    }
  }, [selectedRepo]);

  const fetchCICD = useCallback(async () => {
    if (!selectedRepo) return;

    const [owner, repo] = selectedRepo.split("/");
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/analytics/cicd/${owner}/${repo}?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Unable to load CI/CD metrics");

      const data = (await res.json()) as CiCdData;
      setMetrics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepo, days]);

  useEffect(() => {
    fetchRepos().catch((err) => {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    });
  }, [fetchRepos]);

  useEffect(() => {
    fetchCICD();
  }, [fetchCICD]);

  const successRate = useMemo(() => {
    const success = metrics?.summary.success ?? 0;
    const failure = metrics?.summary.failure ?? 0;
    const total = success + failure;
    if (total === 0) return 0;
    return clampPercent((success / total) * 100);
  }, [metrics?.summary.failure, metrics?.summary.success]);

  const dateRangeLabel: Record<string, string> = {
    "7": "Last 7 days",
    "14": "Last 14 days",
    "30": "Last 30 days",
    "90": "Last 90 days",
  };

  return (
    <Card className="h-full border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
            <Activity className="h-5 w-5" /> Delivery Health
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {dateRangeLabel[days] ?? `Last ${days}d`}
            </span>
            <Badge
              variant="outline"
              className="border-emerald-300 text-emerald-700"
            >
              CI/CD
            </Badge>
          </div>
        </div>

        <select
          className="h-9 rounded-md border border-emerald-200 bg-white px-2 text-sm text-slate-800 mt-1"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          {repos.map((r) => (
            <option key={r.id} value={`${r.owner}/${r.name}`}>
              {r.owner}/{r.name}
            </option>
          ))}
        </select>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            Loading delivery telemetry...
          </p>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && metrics && (
          <>
            <div className="rounded-lg border border-emerald-100 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Workflow success rate
                </span>
                <div className="flex items-center gap-2">
                  <TrendIndicator rate={successRate} />
                  <span className="font-semibold text-emerald-700">
                    {successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress
                value={successRate}
                className="h-2 bg-emerald-100 [&_[data-slot=progress-indicator]]:bg-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-100 bg-white p-3">
                <p className="text-muted-foreground">Avg run duration</p>
                <p className="mt-1 text-base font-semibold text-emerald-800 inline-flex items-center gap-1">
                  <Gauge className="h-4 w-4" />
                  {metrics.summary.avg_duration_min ?? "-"}m
                </p>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-white p-3">
                <p className="text-muted-foreground">Mean recovery time</p>
                <p className="mt-1 text-base font-semibold text-emerald-800 inline-flex items-center gap-1">
                  <TimerReset className="h-4 w-4" />
                  {metrics.summary.mttr_min ?? "-"}m
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 inline-flex items-center gap-2 w-full">
              <Rocket className="h-4 w-4" />
              Deploy frequency:{" "}
              <strong>
                {metrics.summary.deploy_frequency_per_day.toFixed(2)}
              </strong>
              /day
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
