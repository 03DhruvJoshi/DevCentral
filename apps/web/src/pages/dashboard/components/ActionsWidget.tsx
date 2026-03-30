import { type ReactNode, useState, useEffect } from "react";
import {
  GitPullRequest,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Workflow,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Button } from "../../../components/ui/button.js";
import { Badge } from "../../../components/ui/badge.js";

import { API_BASE_URL } from "../types.js";

type Repo = {
  id: number;
  name: string;
  owner: string;
  url: string;
};

type ActionRun = {
  id: number;
  conclusion: string | null;
  html_url: string;
  name: string | null;
};

export function ActionsWidget() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [latestRun, setLatestRun] = useState<ActionRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGitOps = async () => {
      try {
        const token = localStorage.getItem("devcentral_token");

        const reposRes = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!reposRes.ok) {
          throw new Error("Failed to load repositories");
        }

        const repoData = (await reposRes.json()) as Repo[];
        setRepos(repoData);

        const primary = repoData[0];
        if (!primary) {
          return;
        }

        const actionsRes = await fetch(
          `${API_BASE_URL}/api/github/repos/${primary.owner}/${primary.name}/actions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!actionsRes.ok) {
          return;
        }

        const actionsData = (await actionsRes.json()) as {
          workflow_runs?: ActionRun[];
        };
        setLatestRun(actionsData.workflow_runs?.[0] ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGitOps();
  }, []);

  let actionsContent: ReactNode;

  if (isLoading) {
    actionsContent = (
      <Loader2 className="animate-spin h-5 w-5 mx-auto text-orange-600" />
    );
  } else if (error) {
    actionsContent = <p className="text-sm text-red-600">{error}</p>;
  } else {
    actionsContent = (
      <>
        <Button
          variant="outline"
          className="justify-between border-orange-200 hover:bg-orange-100/60"
          onClick={() => {
            const repoUrl = repos[0]?.url;
            if (repoUrl) globalThis.open(`${repoUrl}/pulls`, "_blank");
          }}
        >
          <span className="inline-flex items-center">
            <GitPullRequest className="mr-2 h-4 w-4 text-orange-600" />
            Review PRs in {repos[0]?.name || "primary repository"}
          </span>
          <ExternalLink className="h-4 w-4 text-orange-500" />
        </Button>

        <Button
          variant="outline"
          className="justify-between border-amber-200 hover:bg-amber-50"
          onClick={() => {
            if (latestRun?.html_url) {
              globalThis.open(latestRun.html_url, "_blank");
            }
          }}
        >
          <span className="inline-flex items-center">
            <Workflow className="mr-2 h-4 w-4 text-amber-600" />
            {latestRun?.name || "Inspect latest workflow run"}
          </span>
          <Badge
            variant="outline"
            className={
              latestRun?.conclusion === "success"
                ? "border-emerald-300 text-emerald-700"
                : "border-red-300 text-red-700"
            }
          >
            {latestRun?.conclusion || "pending"}
          </Badge>
        </Button>
      </>
    );
  }

  return (
    <Card className="flex flex-col h-full border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between text-orange-800">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Action Center
          </span>
          <Badge
            variant="outline"
            className="border-orange-300 text-orange-700"
          >
            {repos.length} repos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actionsContent}

        <Button
          variant="outline"
          className="justify-start border-yellow-200 hover:bg-yellow-50"
          onClick={() => globalThis.open("https://sonarcloud.io", "_blank")}
        >
          <ShieldCheck className="mr-2 h-4 w-4 text-yellow-600" /> Resolve
          SonarQube Quality Gate
        </Button>
      </CardContent>
    </Card>
  );
}
