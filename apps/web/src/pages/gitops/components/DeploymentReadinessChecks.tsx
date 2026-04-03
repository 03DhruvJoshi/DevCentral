import { AlertCircle, CheckCircle2, AlertTriangle, Rocket } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Badge } from "../../../components/ui/badge.js";
import { type HealthCheckResult } from "./types.js";

export default function DeploymentReadinessChecks(props: {
  health: HealthCheckResult;
}) {
  const { health } = props;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-600">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-600">Warning</Badge>;
      default:
        return <Badge className="bg-green-600">Info</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-orange-600" />
          Deployment Readiness ({health.deploymentReadinessScore}/25)
        </CardTitle>
        <CardDescription>
          CI/CD pipelines, health checks, rollback procedures, and deployment
          documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {health.deploymentReadinessIssues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p className="font-medium">Ready for deployment!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {health.deploymentReadinessIssues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getSeverityBg(issue.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {issue.description}
                      </span>
                      {getSeverityBadge(issue.severity)}
                    </div>
                    {issue.autofixable && (
                      <div className="text-xs mt-1 text-green-700">
                        ✨ One-click fix available:{" "}
                        <code className="font-mono">{issue.fixAction}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
