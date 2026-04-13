import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";

import { Button } from "../../../../components/ui/button.js";

import {
  type Repository,
  type HealthCheckResult,
  API_BASE_URL,
  token,
} from "../types.js";

export default function RepositoryHealthCard(props: {
  selectedRepo: Repository;
}) {
  const { selectedRepo } = props;
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedRepo) return;
    fetchHealth();
  }, [selectedRepo]);

  async function fetchHealth() {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/gitops/repos/${selectedRepo.owner}/${selectedRepo.name}/health`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error("Health fetch error:", err);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "green":
        return <CheckCircle2 className="h-8 w-8 text-emerald-500" />;
      case "yellow":
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
      case "red":
        return <AlertCircle className="h-8 w-8 text-rose-500" />;
      default:
        return null;
    }
  };

  const getStatusPulse = (status: string) => {
    switch (status) {
      case "green":
        return {
          ping: "bg-emerald-400",
          dot: "bg-emerald-500",
          label: "Healthy",
          text: "text-emerald-700",
        };
      case "yellow":
        return {
          ping: "bg-amber-400",
          dot: "bg-amber-500",
          label: "Needs Attention",
          text: "text-amber-700",
        };
      case "red":
        return {
          ping: "bg-rose-400",
          dot: "bg-rose-500",
          label: "Critical",
          text: "text-rose-700",
        };
      default:
        return {
          ping: "bg-slate-400",
          dot: "bg-slate-500",
          label: "Unknown",
          text: "text-slate-700",
        };
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Repository Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card className="border border-slate-200 shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle>Repository Health</CardTitle>
          <CardDescription>Unable to load health data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchHealth} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalIssues = [
    ...health.securityIssues,
    ...health.codeQualityIssues,
    ...health.deploymentReadinessIssues,
    ...health.teamOwnershipIssues,
  ].filter((i) => i.severity === "critical");

  const pulse = getStatusPulse(health.healthStatus);

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getHealthIcon(health.healthStatus)}
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Repository Health</CardTitle>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulse.ping} opacity-75`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${pulse.dot}`}
                    />
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${pulse.text}`}
                  >
                    {pulse.label}
                  </span>
                </span>
              </div>
              <CardDescription>
                Health score: <strong>{health.totalScore}/100</strong>
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHealth}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score Bar */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              Overall Score
            </span>
            <span className={`text-2xl font-bold tabular-nums ${pulse.text}`}>
              {health.totalScore}
              <span className="text-sm font-normal text-muted-foreground">
                /100
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getProgressColor(health.totalScore)}`}
              style={{ width: `${health.totalScore}%` }}
            />
          </div>
        </div>

        {/* Health Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Security", score: health.securityScore, max: 25 },
            { label: "Code Quality", score: health.codeQualityScore, max: 25 },
            {
              label: "Deployment",
              score: health.deploymentReadinessScore,
              max: 25,
            },
            {
              label: "Team Ownership",
              score: health.teamOwnershipScore,
              max: 25,
            },
          ].map(({ label, score, max }) => (
            <div
              key={label}
              className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {label}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {score}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{max}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressColor((score / max) * 100)}`}
                  style={{ width: `${(score / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Issues Summary */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            {criticalIssues.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            <span className="text-sm font-semibold">
              {criticalIssues.length <= 0
                ? "All Critical Checks Passed"
                : `${criticalIssues.length} Critical Issue${criticalIssues.length === 1 ? "" : "s"} Detected`}
            </span>
          </div>
        </div>

        {/* Recommendations */}
        {health.aiSuggestions.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm font-semibold mb-2 text-slate-700">
              {health.aiSuggestions.length} Fix Suggestion
              {health.aiSuggestions.length > 1 ? "s" : ""}
            </div>
            <div className="space-y-2">
              {health.aiSuggestions.slice(0, 3).map((suggestion) => (
                <div
                  key={`${suggestion.description}-${suggestion.autofixable}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="font-semibold text-slate-800">
                    {suggestion.description}
                  </div>
                  {suggestion.autofixable && (
                    <div className="mt-1 flex items-center gap-1 text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>One-click fix available in Quick Fixes below</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
