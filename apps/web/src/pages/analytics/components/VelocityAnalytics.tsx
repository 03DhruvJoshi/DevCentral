import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Github,
  Loader2,
  AlertTriangle,
  Clock,
  GitMerge,
  AlertOctagon,
  Ghost,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL, token } from "./types.js";
import type { Repository, Velocity } from "./types.js";

export default function VelocityAnalytics(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const navigate = useNavigate();

  const [velocity, setVelocity] = useState<Velocity | null>(null);
  const [isVelocityLoading, setIsVelocityLoading] = useState(false);
  const [velocityError, setVelocityError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchVelocity() {
      setVelocity(null);
      setVelocityError(null);
      setIsVelocityLoading(true);

      try {
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/analytics/velocity/${selectedRepo?.owner}/${selectedRepo?.name}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
  }, [navigate, selectedRepo]);

  return (
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
                      data={Object.entries(velocity.pr_size_distribution).map(
                        ([size, count]) => ({ size, count }),
                      )}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="size" axisLine={false} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip cursor={{ fill: "transparent" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {Object.entries(velocity.pr_size_distribution).map(
                          ([size, _], index) => {
                            // Color code sizes: XS/S = Green, M = Yellow, L/XL = Red
                            const fill =
                              size === "L" || size === "XL"
                                ? "#ef4444"
                                : size === "M"
                                  ? "#eab308"
                                  : "#22c55e";
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          },
                        )}
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
                    Time to First Review vs Total Time to Merge (Recent PRs).
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {velocity.review_time.prs.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={velocity.review_time.prs.slice().reverse()}
                        margin={{
                          top: 10,
                          right: 10,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
  );
}
