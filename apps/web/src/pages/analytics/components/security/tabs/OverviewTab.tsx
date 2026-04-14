import {
  ShieldCheck,
  Bug,
  AlertTriangle,
  Activity,
  AlertOctagon,
} from "lucide-react";
import { Card, CardContent } from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";

import { getRatingLetter, getRatingColor } from "../utilities.js";

export default function OverviewTab({
  metrics,
  totalSeverityIssues,
  securityHotspots,
  ncloc,
  riskIndex,
  riskLevel,
  riskBadgeClass,
}: {
  metrics: any;
  totalSeverityIssues: any;
  securityHotspots: any;
  ncloc: any;
  riskIndex: any;
  riskLevel: any;
  riskBadgeClass: any;
}) {
  return (
    <>
      {/* --- ROW 1: THE EXECUTIVE SUMMARY KPI CARDS --- */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quality Gate */}
        <Card
          className={
            metrics.alert_status === "OK"
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-rose-200 bg-rose-50/30"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                Quality Gate
              </p>
              {metrics.alert_status === "OK" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertOctagon className="h-5 w-5 text-rose-600" />
              )}
            </div>
            <h3
              className={`text-4xl font-black tracking-tighter ${metrics.alert_status === "OK" ? "text-emerald-700" : "text-rose-700"}`}
            >
              {metrics.alert_status === "OK" ? "PASSED" : "FAILED"}
            </h3>
            <p className="text-xs text-muted-foreground mt-2">
              Overall release readiness
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-rose-100 bg-rose-50/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-600">Security</p>
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-4xl font-black tracking-tighter text-rose-700">
                  {metrics.vulnerabilities || "0"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Open Vulnerabilities
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.security_rating))}`}
              >
                {getRatingLetter(metrics.security_rating)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Reliability */}
        <Card className="border-amber-100 bg-amber-50/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-600">
                Reliability
              </p>
              <Bug className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-4xl font-black tracking-tighter text-amber-700">
                  {metrics.bugs || "0"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Identified Bugs
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.reliability_rating))}`}
              >
                {getRatingLetter(metrics.reliability_rating)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Maintainability (New) */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-600">
                Maintainability
              </p>
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-4xl font-black tracking-tighter text-indigo-700">
                  {metrics.code_smells || "0"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Code Smells
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xl font-black px-3 py-1 ${getRatingColor(getRatingLetter(metrics.sqale_rating))}`}
              >
                {getRatingLetter(metrics.sqale_rating)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* --- ROW 2: SUPPORTING METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Security Hotspots
            </p>
            <p className="text-3xl font-black tracking-tighter text-slate-800 mt-2">
              {securityHotspots}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Areas requiring manual security review.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Violations
            </p>
            <p className="text-3xl font-black tracking-tighter text-slate-800 mt-2">
              {totalSeverityIssues}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of blocker, critical, major and minor issues.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lines Of Code
            </p>
            <p className="text-3xl font-black tracking-tighter text-slate-800 mt-2">
              {ncloc.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for normalized density analysis.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Composite Risk Index
            </p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-3xl font-black tracking-tighter text-slate-800">
                {riskIndex}
              </p>
              <Badge variant="outline" className={riskBadgeClass}>
                {riskLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
