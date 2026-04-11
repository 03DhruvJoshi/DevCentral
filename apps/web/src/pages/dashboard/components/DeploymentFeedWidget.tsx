import { useCallback, useEffect, useState } from "react";
import { Rocket, Loader2, Clock3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { API_BASE_URL } from "../types.js";

type Repo = {
  id: number;
  name: string;
  owner: string;
};

type Deployment = {
  id: number;
  environment: string;
  description: string | null;
  created_at: string;
  ref: string;
  sha: string;
};

function formatRelative(isoDate: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(isoDate).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function envBadgeClass(env: string): string {
  const lower = env.toLowerCase();
  if (lower.includes("prod")) return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (lower.includes("preview") || lower.includes("staging")) return "border-blue-300 bg-blue-50 text-blue-700";
  if (lower.includes("develop") || lower.includes("dev")) return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-50 text-slate-600";
}

export function DeploymentFeedWidget() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    const token = localStorage.getItem("devcentral_token");
    const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load repositories");
    const data = (await res.json()) as Repo[];
    const compact = data.slice(0, 8);
    setRepos(compact);
    if (!selectedRepo && compact[0]) {
      setSelectedRepo(`${compact[0].owner}/${compact[0].name}`);
    }
  }, [selectedRepo]);

  const fetchDeployments = useCallback(async () => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split("/");
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/github/repos/${owner}/${repo}/deployments`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load deployments");
      const raw = await res.json();
      const list: Deployment[] = Array.isArray(raw)
        ? raw
        : (raw as { deployments?: Deployment[] }).deployments ?? [];
      setDeployments(list.slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeployments([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepo]);

  useEffect(() => {
    fetchRepos().catch((err) => {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    });
  }, [fetchRepos]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  return (
    <Card className="flex flex-col h-full border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-teal-800 flex items-center gap-2">
            <Rocket className="h-5 w-5" /> Deployment Feed
          </CardTitle>
          <Badge variant="outline" className="border-teal-300 text-teal-700">
            Live
          </Badge>
        </div>

        <select
          className="h-9 rounded-md border border-teal-200 bg-white px-2 text-sm text-slate-800 mt-1"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          {repos.map((r) => (
            <option key={r.id} value={`${r.owner}/${r.name}`}>
              {r.owner}/{r.name}
            </option>
          ))}
        </select>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-5 w-5 text-teal-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && deployments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <Rocket className="h-8 w-8 text-teal-200" />
            <p className="text-sm text-muted-foreground">No recent deployments found</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          deployments.map((deploy) => (
            <div
              key={deploy.id}
              className="rounded-xl border border-teal-100 bg-white p-3 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {deploy.description || `Deploy to ${deploy.environment}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                      {deploy.ref}
                    </span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${envBadgeClass(deploy.environment)}`}
                >
                  {deploy.environment}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {formatRelative(deploy.created_at)}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
