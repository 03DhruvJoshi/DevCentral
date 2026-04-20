import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";

import { Badge } from "../../../../components/ui/badge.js";
import { type HealthCheckResult } from "../types.js";

export default function CodeQualityChecks(props: {
  health: HealthCheckResult | null;
  isLoading?: boolean;
}) {
  const { health, isLoading = false } = props;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-rose-500 bg-rose-50/50";
      case "warning":
        return "border-l-amber-500 bg-amber-50/50";
      default:
        return "border-l-emerald-500 bg-emerald-50/50";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 border border-rose-200 hover:bg-rose-500/20 text-[10px] px-1.5 py-0">
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border border-amber-200 hover:bg-amber-500/20 text-[10px] px-1.5 py-0">
            Warning
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-200 hover:bg-emerald-500/20 text-[10px] px-1.5 py-0">
            Info
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-sm bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-slate-700" />
            Code Quality
          </CardTitle>
          <CardDescription className="text-xs">
            Test coverage · documentation · linting · code standards
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading quality checks...
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  return (
    <Card className="border border-slate-200 shadow-sm bg-slate-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-slate-700" />
            Code Quality
          </span>
          <span className="text-xs font-bold tabular-nums text-slate-500">
            {health.codeQualityScore}
            <span className="font-normal">/25</span>
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Test coverage · documentation · linting · code standards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {health.codeQualityIssues.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="font-medium">Code quality standards met</p>
          </div>
        ) : (
          <div className="space-y-2">
            {health.codeQualityIssues.map((issue) => (
              <div
                key={`${issue.severity}-${issue.description}`}
                className={`rounded-md border border-slate-200 py-2.5 pl-3 transition-colors hover:bg-slate-50 ${getSeverityBorder(issue.severity)}`}
              >
                <div className="flex items-start gap-2.5">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs text-slate-800">
                        {issue.description}
                      </span>
                      {getSeverityBadge(issue.severity)}
                    </div>
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
