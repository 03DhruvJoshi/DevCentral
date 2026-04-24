import {
  ShieldCheck,
  AlertTriangle,
  Timer,
  Activity,
  ServerCrash,
  CircleDashed,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type CICD from "../types.js";

import { formatDate, TOOLTIP_STYLE } from "../utilities.js";

export default function DoraMetricsTab({
  cicd,
  conclusionChartData,
}: Readonly<{
  cicd: CICD;
  conclusionChartData: any;
}>) {
  const pieData = conclusionChartData.map((entry: any) => ({
    ...entry,
    fill: entry.color,
  }));

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Pipeline Success",
            icon: (
              <ShieldCheck
                className={`h-5 w-5 ${cicd.summary.change_failure_rate > 20 ? "text-rose-500" : "text-emerald-500"}`}
              />
            ),
            value: `${
              cicd.summary.total_runs > 0
                ? (
                    (cicd.summary.success / cicd.summary.total_runs) *
                    100
                  ).toFixed(1)
                : "0"
            }%`,
            valueClass:
              cicd.summary.change_failure_rate > 20
                ? "text-red-700"
                : "text-green-700",
            sub: `Based on ${cicd.summary.total_runs} runs`,
          },
          {
            label: "Change Failure Rate",
            icon: <ServerCrash className="h-5 w-5 text-rose-500" />,
            value: `${cicd.summary.change_failure_rate}%`,
            valueClass: "text-red-700",
            sub: "Deployments resulting in failure",
          },
          {
            label: "Deploy Frequency",
            icon: <Activity className="h-5 w-5 text-blue-500" />,
            value: `${cicd.summary.deploy_frequency_per_day}/day`,
            valueClass: "text-blue-700",
            sub: "Successful default branch merges",
          },
          {
            label: "Queue SLA Breaches",
            icon: <CircleDashed className="h-5 w-5 text-amber-500" />,
            value: String(cicd.summary.queue_sla_breach_count ?? 0),
            valueClass: "text-yellow-700",
            sub: "Runs waiting over 10 minutes in queue",
          },
          {
            label: "Long Running Runs",
            icon: <Timer className="h-5 w-5 text-orange-500" />,
            value: String(cicd.summary.long_running_count ?? 0),
            valueClass: "text-orange-700",
            sub: "Runs executing over 20 minutes",
          },
          {
            label: "Flaky Commit Count",
            icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
            value: String(cicd.summary.flaky_commit_count ?? 0),
            valueClass: "text-red-700",
            sub: "Commits with both failed and successful reruns",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 shadow-sm hover:bg-slate-100 transition-colors ${item.span ?? ""}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              {item.icon}
            </div>
            <p
              className={`text-2xl font-black tracking-tighter ${item.valueClass}`}
            >
              {item.value}
            </p>
            <p className="text-xs text-slate-700 mt-2 font-medium">
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Stability Chart */}
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Build Stability Trend</CardTitle>
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
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
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

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Run Outcome Distribution</CardTitle>
            <CardDescription>
              Exact run conclusion split for the selected time range.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="conclusion"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} />
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
    </>
  );
}
