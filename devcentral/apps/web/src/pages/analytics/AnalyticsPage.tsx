// apps/web/src/features/analytics/AnalyticsPage.tsx

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  GitPullRequest,
  GitCommit,
  CheckCircle,
  Clock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

import {
  DEPLOYMENT_DATA,
  CYCLE_TIME_DATA,
  CHURN_DATA,
} from "./AnalyticsMockData";

// 4. Build Success Rate
const SUCCESS_DATA = [
  { name: "Success", value: 85 },
  { name: "Failed", value: 15 },
];
const SUCCESS_COLORS = ["#16a34a", "#dc2626"]; // Tailwind green-600 and red-600

export function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Developer Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            DORA metrics and team performance indicators.
          </p>
        </div>

        <Select defaultValue="6weeks">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2weeks">Last 2 weeks</SelectItem>
            <SelectItem value="4weeks">Last 4 weeks</SelectItem>
            <SelectItem value="6weeks">Last 6 weeks</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2. Top Level KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. PR Cycle Time
                </p>
                <h3 className="text-3xl font-bold text-primary">18h</h3>
              </div>
              <Clock className="h-8 w-8 text-blue-500/80" />
            </div>
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> 12% faster than last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Deployment Frequency
                </p>
                <h3 className="text-3xl font-bold text-primary">4.2 / day</h3>
              </div>
              <GitCommit className="h-8 w-8 text-purple-500/80" />
            </div>
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> +1.2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Merge Rate
                </p>
                <h3 className="text-3xl font-bold text-primary">92%</h3>
              </div>
              <GitPullRequest className="h-8 w-8 text-orange-500/80" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              of all open PRs get merged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Build Success Rate
                </p>
                <h3 className="text-3xl font-bold text-primary">85%</h3>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/80" />
            </div>
            <p className="text-xs text-red-500 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> Down 2% due to
              test flakiness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Deployment Velocity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Deployment Frequency (Velocity)</CardTitle>
            <CardDescription>
              Number of successful production releases per week.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEPLOYMENT_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="deployments"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: PR Cycle Time */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>PR Cycle Time</CardTitle>
            <CardDescription>
              Hours taken from first commit to merge.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CYCLE_TIME_DATA}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Code Churn */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Code Churn</CardTitle>
            <CardDescription>
              Lines of code added vs deleted. High churn indicates refactoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHURN_DATA} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar
                  dataKey="additions"
                  fill="#10b981"
                  stackId="stack"
                  radius={[4, 4, 0, 0]}
                  name="Additions (+)"
                />
                <Bar
                  dataKey="deletions"
                  fill="#ef4444"
                  stackId="stack"
                  radius={[0, 0, 4, 4]}
                  name="Deletions (-)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Build Success Rate */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pipeline Success Rate</CardTitle>
            <CardDescription>
              Ratio of passing to failing CI/CD builds.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SUCCESS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {SUCCESS_DATA.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SUCCESS_COLORS[index % SUCCESS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend placed next to the chart */}
            <div className="absolute flex flex-col gap-2">
              <span className="text-sm font-medium flex items-center">
                <span className="h-3 w-3 bg-green-600 rounded-full mr-2"></span>{" "}
                Success (85%)
              </span>
              <span className="text-sm font-medium flex items-center">
                <span className="h-3 w-3 bg-red-600 rounded-full mr-2"></span>{" "}
                Failed (15%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
