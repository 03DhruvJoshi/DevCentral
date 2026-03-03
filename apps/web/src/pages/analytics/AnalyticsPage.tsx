import { GitBranch, Github } from "lucide-react";
import { useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";

import SecurityAnalytics from "./components/SecurityAnalytics.js";
import VelocityAnalytics from "./components/VelocityAnalytics.js";
import CICDAnalytics from "./components/CICDAnalytics.js";
import DeploymentAnalytics from "./components/DeploymentAnalytics.js";
import RepoAnalytics from "./components/RepoAnalytics.js";
import type { Repository } from "./components/types.js";

export function AnalyticsPage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Developer Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            DORA metrics and team performance indicators.
          </p>
        </div>

        {/* Connection Badge */}
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1.5 px-3 border-green-200 bg-green-50 text-green-700"
        >
          <Github className="h-4 w-4" />
          <span className="font-medium">GitHub Connected</span>
          <span className="h-2 w-2 rounded-full ml-1 bg-green-500 animate-pulse" />
        </Badge>
      </div>

      <RepoAnalytics
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-auto max-w-xlg grid-cols-4">
            <TabsTrigger value="security">Security Metrics</TabsTrigger>
            <TabsTrigger value="velocity">
              Quality & Velocity Metrics
            </TabsTrigger>
            <TabsTrigger value="cicd">CI / CD Quality Metrics</TabsTrigger>
            <TabsTrigger value="deployment">Deployment Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-6">
            <SecurityAnalytics selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="velocity" className="mt-6">
            <VelocityAnalytics selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="cicd" className="mt-6">
            <CICDAnalytics selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="deployment" className="mt-6">
            <DeploymentAnalytics selectedRepo={selectedRepo} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-20" />
          No repository selected. Please select a repository to view analytics.
        </div>
      )}
    </div>
  );
}
