import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Bug,
  AlertCircle,
  Clock3,
  ExternalLink,
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

type GitHubRepo = {
  id: number;
  name: string;
  owner: string;
};

type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  html_url: string;
  pull_request?: unknown;
};

const formatRelativeDate = (isoDate: string, prefix: string) => {
  const now = Date.now();
  const created = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - created);
  const hours = Math.floor(diffMs / 3_600_000);

  if (hours < 1) return `${prefix} just now`;
  if (hours < 24) return `${prefix} ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${prefix} ${days}d ago`;

  const months = Math.floor(days / 30);
  return `${prefix} ${months}mo ago`;
};

export function RepoPulseWidget() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    const token = localStorage.getItem("devcentral_token");
    const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Failed to load repositories");
    }

    const data = (await res.json()) as GitHubRepo[];
    const compact = data.slice(0, 8);
    setRepos(compact);

    if (!selectedRepo && compact[0]) {
      setSelectedRepo(`${compact[0].owner}/${compact[0].name}`);
    }
  }, [selectedRepo]);

  const fetchIssues = useCallback(async () => {
    if (!selectedRepo) return;

    const [owner, repo] = selectedRepo.split("/");
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/github/repos/${owner}/${repo}/issues`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to load GitHub issues");
      }

      const data = (await res.json()) as GitHubIssue[];
      const issueOnly = data.filter((item) => !item.pull_request);
      setIssues(issueOnly);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setIssues([]);
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
    fetchIssues();
  }, [fetchIssues]);

  return (
    <Card className="h-full border-cyan-200 bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-cyan-800 flex items-center gap-2">
            <Bug className="h-5 w-5" /> GitHub Issues
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-cyan-700 hover:bg-cyan-100"
            onClick={fetchIssues}
            disabled={isLoading}
            aria-label="Refresh issues"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <select
          className="h-9 rounded-md border border-cyan-200 bg-white px-2 text-sm text-slate-800"
          value={selectedRepo}
          onChange={(event) => setSelectedRepo(event.target.value)}
        >
          {repos.map((repo) => (
            <option key={repo.id} value={`${repo.owner}/${repo.name}`}>
              {repo.owner}/{repo.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-xs text-cyan-700">
          <Badge variant="outline" className="border-cyan-300 text-cyan-700">
            {issues.length} issues shown
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading issues...</p>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && repos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No repositories available for this user.
          </p>
        )}

        {!isLoading && !error && repos.length > 0 && issues.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No issues found for this repository.
          </p>
        )}

        {!isLoading &&
          !error &&
          issues.length > 0 &&
          issues.map((issue) => (
            <a
              key={issue.id}
              href={issue.html_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-cyan-100 bg-white/90 p-3 transition hover:border-cyan-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    #{issue.number} {issue.title}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    issue.state === "open"
                      ? "border-emerald-300 text-emerald-700"
                      : "border-slate-300 text-slate-700"
                  }
                >
                  {issue.state === "open" ? (
                    <>
                      <AlertCircle className="h-3 w-3" /> Open
                    </>
                  ) : (
                    <>Closed</>
                  )}
                </Badge>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {formatRelativeDate(issue.created_at, "opened")}
                </span>
                <span className="inline-flex items-center gap-1 text-cyan-700">
                  Open in GitHub <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
      </CardContent>
    </Card>
  );
}
