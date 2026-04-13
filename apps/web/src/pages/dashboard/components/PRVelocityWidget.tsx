import { useCallback, useEffect, useMemo, useState } from "react";
import { GitPullRequest, Timer, ShieldAlert, GitMerge } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { Progress } from "../../../components/ui/progress.js";

import { API_BASE_URL } from "../types.js";
import { useDashboardContext } from "../DashboardContext.js";

type GitHubRepo = {
  id: number;
  name: string;
  owner: string;
};

type VelocityData = {
  review_time: {
    avg_first_review_h: number | null;
    avg_merge_h: number | null;
  };
  stale_prs: Array<{ number: number; title: string; days_stale: number }>;
  merge_conflicts: Array<{ number: number; title: string }>;
  pr_size_distribution: {
    XS: number;
    S: number;
    M: number;
    L: number;
    XL: number;
  };
};

const toPercent = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
};

type SizeKey = "XS" | "S" | "M" | "L" | "XL";

const SIZE_COLORS: Record<SizeKey, string> = {
  XS: "bg-emerald-400",
  S: "bg-sky-400",
  M: "bg-amber-400",
  L: "bg-orange-400",
  XL: "bg-red-400",
};

export function PRVelocityWidget() {
  const { dateRange } = useDashboardContext();
  const days = dateRange.replace("d", "");

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
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

  const fetchVelocity = useCallback(async () => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split("/");
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/analytics/velocity/${owner}/${repo}?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error("Unable to load velocity metrics");

      const data = (await res.json()) as VelocityData;
      setVelocity(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setVelocity(null);
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
    fetchVelocity();
  }, [fetchVelocity]);

  const stalePressure = useMemo(
    () => Math.min(100, (velocity?.stale_prs.length ?? 0) * 15),
    [velocity?.stale_prs.length],
  );

  const sizeTotal = useMemo(() => {
    if (!velocity) return 0;
    return Object.values(velocity.pr_size_distribution).reduce(
      (a, b) => a + b,
      0,
    );
  }, [velocity]);

  return (
    <Card className="h-full border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-violet-800 flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" /> PR Velocity
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {(velocity?.stale_prs.length ?? 0) > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                {velocity?.stale_prs.length} stale
              </Badge>
            )}
            <Badge
              variant="outline"
              className="border-violet-300 text-violet-700"
            >
              Live
            </Badge>
          </div>
        </div>

        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="h-9 rounded-md border border-violet-200 bg-white px-2 text-sm text-slate-800 mt-1"
        >
          {repos.map((repo) => (
            <option key={repo.id} value={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </option>
          ))}
        </select>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            Crunching pull request signals...
          </p>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && velocity && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-violet-100 bg-white p-3">
                <p className="text-xs text-muted-foreground">
                  Avg first review
                </p>
                <p className="text-xl font-bold text-violet-800 inline-flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {velocity.review_time.avg_first_review_h ?? "-"}h
                </p>
              </div>
              <div className="rounded-lg border border-violet-100 bg-white p-3">
                <p className="text-xs text-muted-foreground">Avg merge time</p>
                <p className="text-xl font-bold text-violet-800 inline-flex items-center gap-1">
                  <GitMerge className="h-4 w-4" />
                  {velocity.review_time.avg_merge_h ?? "-"}h
                </p>
              </div>
            </div>

            {/* Stale PR pressure */}
            <div className="space-y-1 rounded-lg border border-violet-100 bg-white p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Stale PR pressure</span>
                <span className="font-medium text-violet-700">
                  {velocity.stale_prs.length} stale
                </span>
              </div>
              <Progress
                value={stalePressure}
                className="h-2 bg-violet-100 [&_[data-slot=progress-indicator]]:bg-violet-500"
              />
            </div>

            {/* PR Size distribution mini bar chart */}
            {sizeTotal > 0 && (
              <div className="rounded-lg border border-violet-100 bg-white p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  PR Size Distribution
                </p>
                <div className="flex items-end gap-1 h-8">
                  {(["XS", "S", "M", "L", "XL"] as SizeKey[]).map((size) => {
                    const count = velocity.pr_size_distribution[size];
                    const pct = toPercent(count, sizeTotal);
                    return (
                      <div
                        key={size}
                        className="flex-1 flex flex-col items-center gap-0.5"
                      >
                        <div
                          className={`w-full rounded-t-sm ${SIZE_COLORS[size]}`}
                          style={{ height: `${Math.max(4, pct * 0.28)}px` }}
                          title={`${size}: ${count} (${pct}%)`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {size}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {velocity.merge_conflicts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 inline-flex items-center gap-2 w-full">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {velocity.merge_conflicts.length} active merge conflict
                {velocity.merge_conflicts.length !== 1 ? "s" : ""} detected in
                open PRs.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
