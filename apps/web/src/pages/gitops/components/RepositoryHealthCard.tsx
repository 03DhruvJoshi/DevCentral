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
} from "../../../components/ui/card.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Progress } from "../../../components/ui/progress.js";

import {
  type Repository,
  type HealthCheckResult,
  API_BASE_URL,
  token,
} from "./types.js";

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
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case "yellow":
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      case "red":
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return null;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-100 border-green-300";
      case "yellow":
        return "bg-yellow-100 border-yellow-300";
      case "red":
        return "bg-red-100 border-red-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  if (isLoading) {
    return (
      <Card className="border-2">
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
      <Card className="border-2">
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

  const totalIssues =
    health.securityIssues.length +
    health.codeQualityIssues.length +
    health.deploymentReadinessIssues.length +
    health.teamOwnershipIssues.length;

  const criticalIssues = [
    ...health.securityIssues,
    ...health.codeQualityIssues,
    ...health.deploymentReadinessIssues,
    ...health.teamOwnershipIssues,
  ].filter((i) => i.severity === "critical");

  return (
    <Card className={`border-2 ${getHealthColor(health.healthStatus)}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getHealthIcon(health.healthStatus)}
            <div>
              <CardTitle>Repository Health</CardTitle>
              <CardDescription>
                {health.totalScore}/100 - {health.healthStatus.toUpperCase()}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHealth}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-lg font-bold">{health.totalScore}/100</span>
          </div>
          <Progress value={health.totalScore} className="h-3" />
        </div>

        {/* Health Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          {/* Security */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                SECURITY
              </span>
              <span className="text-sm font-bold">
                {health.securityScore}/25
              </span>
            </div>
            <Progress
              value={(health.securityScore / 25) * 100}
              className="h-2"
            />
          </div>

          {/* Code Quality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                CODE QUALITY
              </span>
              <span className="text-sm font-bold">
                {health.codeQualityScore}/25
              </span>
            </div>
            <Progress
              value={(health.codeQualityScore / 25) * 100}
              className="h-2"
            />
          </div>

          {/* Deployment Readiness */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                DEPLOYMENT
              </span>
              <span className="text-sm font-bold">
                {health.deploymentReadinessScore}/25
              </span>
            </div>
            <Progress
              value={(health.deploymentReadinessScore / 25) * 100}
              className="h-2"
            />
          </div>

          {/* Team Ownership */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                TEAM OWNERSHIP
              </span>
              <span className="text-sm font-bold">
                {health.teamOwnershipScore}/25
              </span>
            </div>
            <Progress
              value={(health.teamOwnershipScore / 25) * 100}
              className="h-2"
            />
          </div>
        </div>

        {/* Issues Summary */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            {criticalIssues.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            <span className="text-sm font-semibold">
              {criticalIssues.length > 0
                ? `${criticalIssues.length} Critical Issue${criticalIssues.length !== 1 ? "s" : ""}`
                : "All Critical Issues Resolved"}
            </span>
          </div>

          {totalIssues > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                🔒 {health.securityIssues.length} Security
              </Badge>
              <Badge variant="outline" className="text-xs">
                📊 {health.codeQualityIssues.length} Quality
              </Badge>
              <Badge variant="outline" className="text-xs">
                🚀 {health.deploymentReadinessIssues.length} Deployment
              </Badge>
              <Badge variant="outline" className="text-xs">
                👥 {health.teamOwnershipIssues.length} Team
              </Badge>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {health.aiSuggestions.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm font-semibold mb-2">
              🤖 {health.aiSuggestions.length} Recommendations
            </div>
            <div className="space-y-2">
              {health.aiSuggestions.slice(0, 3).map((suggestion, idx) => (
                <div
                  key={idx}
                  className="text-xs p-2 rounded bg-blue-50 border border-blue-200"
                >
                  <div className="font-semibold text-blue-900">
                    {suggestion.description}
                  </div>
                  {suggestion.autofixable && (
                    <div className="text-blue-700 mt-1">
                      ✨ One-click fix available
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
