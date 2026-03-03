// apps/web/src/features/gitops/GitOpsPage.tsx

import { useEffect, useState } from "react";
import { Github } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";

import { useNavigate } from "react-router-dom";
import GitOpsPRs from "./components/GitOpsPRs.js";
import GitOpsActions from "./components/GitOpsActions.js";
import GitOpsReleases from "./components/GitOpsReleases.js";
import { type Repository } from "./components/types.js";
import GitOpsRepos from "./components/GitOpsRepos.js";

export function GitOpsPage() {
  const navigate = useNavigate();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("devcentral_token");
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitOps & CI/CD</h1>
          <p className="text-muted-foreground mt-1">
            Manage your repositories and deployment pipelines.
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

      <GitOpsRepos
        selectedRepo={selectedRepo}
        setSelectedRepo={setSelectedRepo}
      />

      {selectedRepo ? (
        <Tabs defaultValue="prs" className="w-full">
          <TabsList className="grid w-auto max-w-xlg grid-cols-3">
            <TabsTrigger value="prs">Pull Requests</TabsTrigger>
            <TabsTrigger value="pipelines">CI/CD Pipelines</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
          </TabsList>
          {/* === TAB 1: PULL REQUESTS === */}
          <TabsContent value="prs" className="mt-6">
            <GitOpsPRs selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="pipelines" className="mt-6">
            <GitOpsActions selectedRepo={selectedRepo} />
          </TabsContent>

          <TabsContent value="releases" className="mt-6">
            <GitOpsReleases selectedRepo={selectedRepo} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
          Select a repository above to view details.
        </div>
      )}
    </div>
  );
}
