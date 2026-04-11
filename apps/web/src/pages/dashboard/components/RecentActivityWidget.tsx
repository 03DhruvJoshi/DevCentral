import { useCallback, useEffect, useState } from "react";
import { GitCommit, Loader2, Clock3, ExternalLink } from "lucide-react";
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

type CommitAuthor = {
  name: string;
  date: string;
};

type CommitData = {
  message: string;
  author: CommitAuthor;
};

type GitHubUser = {
  login: string;
} | null;

type Commit = {
  sha: string;
  commit: CommitData;
  html_url: string;
  author: GitHubUser;
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

export function RecentActivityWidget() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [commits, setCommits] = useState<Commit[]>([]);
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

  const fetchCommits = useCallback(async () => {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split("/");
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/github/repos/${owner}/${repo}/commits?per_page=6`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load commits");
      const raw = await res.json();
      const list: Commit[] = Array.isArray(raw)
        ? raw
        : (raw as { commits?: Commit[] }).commits ?? [];
      setCommits(list.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setCommits([]);
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
    fetchCommits();
  }, [fetchCommits]);

  return (
    <Card className="flex flex-col h-full border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
            <GitCommit className="h-5 w-5" /> Recent Commits
          </CardTitle>
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {commits.length} shown
          </Badge>
        </div>

        <select
          className="h-9 rounded-md border border-amber-200 bg-white px-2 text-sm text-slate-800 mt-1"
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
            <Loader2 className="animate-spin h-5 w-5 text-amber-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && commits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <GitCommit className="h-8 w-8 text-amber-200" />
            <p className="text-sm text-muted-foreground">No commits found</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          commits.map((commit) => {
            const shortSha = commit.sha.slice(0, 7);
            const firstLine = commit.commit.message.split("\n")[0] ?? "";
            const authorName =
              commit.author?.login ?? commit.commit.author.name;

            return (
              <a
                key={commit.sha}
                href={commit.html_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-amber-100 bg-white p-3 hover:border-amber-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate flex-1 leading-snug">
                    {firstLine}
                  </p>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-amber-700">
                    {shortSha}
                  </span>
                  <span className="truncate">{authorName}</span>
                  <span className="flex items-center gap-1 ml-auto shrink-0">
                    <Clock3 className="h-3 w-3" />
                    {formatRelative(commit.commit.author.date)}
                  </span>
                </div>
              </a>
            );
          })}
      </CardContent>
    </Card>
  );
}
