import type { SonarMetrics } from "./types.js";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Github,
  Loader2,
  ShieldCheck,
  Bug,
  AlertTriangle,
  Code,
  Search,
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
} from "recharts";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL, token } from "./types.js";
import type { Repository } from "./types.js";

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

export default function SecurityAnalytics(props: { selectedRepo: Repository }) {
  const navigate = useNavigate();
  const { selectedRepo } = props;

  const [metrics, setMetrics] = useState<SonarMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchSonarMetrics() {
      setIsLoading(true);
      setError(null);
      setMetrics(null);

      try {
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/analytics/sonar/${selectedRepo?.owner}/${selectedRepo?.name}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
  }, [navigate, selectedRepo]);

  // Chart 1: Issue Breakdown (Bar Chart)
  const issueData = metrics
    ? [
        {
          name: "Bugs",
          count: Number.parseInt(metrics.bugs || "0"),
          fill: "#ef4444",
        }, // Red
        {
          name: "Vulnerabilities",
          count: Number.parseInt(metrics.vulnerabilities || "0"),
          fill: "#f97316",
        }, // Orange
        {
          name: "Code Smells",
          count: Number.parseInt(metrics.code_smells || "0"),
          fill: "#eab308",
        }, // Yellow
      ]
    : [];

  // Chart 2: Code Coverage (Donut Chart)
  const coverageValue = Number.parseFloat(metrics?.coverage || "0");

  const coverageData = [
    { name: "Covered", value: coverageValue, fill: "#22c55e" }, // Green
    { name: "Uncovered", value: 100 - coverageValue, fill: "#f1f5f9" }, // Slate/Gray
  ];

  return (
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
              Ensure the repository exists and has been analyzed in SonarCloud.
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
                      {metrics.alert_status === "OK" ? "PASSED" : "FAILED"}
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
                    Breakdown of maintainability, reliability, and security
                    issues.
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: "transparent" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {issueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
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
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value}%`} />
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
  );
}
