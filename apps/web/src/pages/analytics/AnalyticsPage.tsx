import {
  GitBranch,
  Github,
  ShieldAlert,
  Zap,
  Rocket,
  BarChart2,
} from "lucide-react";
import { useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";

import SecurityAnalytics from "./components/security/SecurityAnalytics.js";
import CICDAnalytics from "./components/cicd/CICDAnalytics.js";
import DeploymentAnalytics from "./components/deployment/DeploymentAnalytics.js";
import RepoAnalytics from "./components/RepoAnalytics.js";
import type { Repository } from "./components/types.js";

export function AnalyticsPage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(148,163,184,0.12),transparent)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 ring-1 ring-slate-800/20 shadow-sm">
              <BarChart2 className="h-5 w-5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Developer Analytics
              </h1>
              <p className="text-slate-600 text-sm mt-0.5">
                DORA metrics · security posture · CI/CD telemetry · deployment
                insights
              </p>
            </div>
          </div>
          <Badge className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Github className="h-3.5 w-3.5" />
            <span className="font-medium">GitHub Connected</span>
          </Badge>
        </div>
      </div>

      {/* ── Repository Selector ── */}
      <RepoAnalytics
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="mb-2 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
            <TabsTrigger
              value="security"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Security Metrics
            </TabsTrigger>
            <TabsTrigger
              value="cicd"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              CI/CD Metrics
            </TabsTrigger>
            <TabsTrigger
              value="deployment"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <Rocket className="h-3.5 w-3.5" />
              Deployment Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-4">
            <SecurityAnalytics selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="cicd" className="mt-4">
            <CICDAnalytics selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="deployment" className="mt-4">
            <DeploymentAnalytics selectedRepo={selectedRepo} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="h-[400px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <GitBranch className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              No repository selected
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Select a repository above to view analytics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
