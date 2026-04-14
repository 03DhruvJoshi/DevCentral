import { useState, useEffect } from "react";
import { GitBranch, ExternalLink, Search } from "lucide-react";
import { Button } from "../../../components/ui/button.js";
import { type Repository, API_BASE_URL } from "./types.js";

interface GitOpsReposProps {
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
}

export default function GitOpsRepos({
  selectedRepo,
  setSelectedRepo,
}: Readonly<GitOpsReposProps>) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isReposLoading, setIsReposLoading] = useState(true);
  const [repoLoadError, setRepoLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        setRepoLoadError(null);
        const token = localStorage.getItem("devcentral_token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorBody = (await res
            .json()
            .catch(() => ({ error: "Failed to fetch repos" }))) as {
            error?: string;
            githubMessage?: string;
          };
          const message = [errorBody.error, errorBody.githubMessage]
            .filter(Boolean)
            .join(" - ");
          throw new Error(message || "Failed to fetch repos");
        }

        const data = await res.json();
        setRepos(data);

        if (!selectedRepo && data.length > 0) {
          setSelectedRepo(data[0]);
        }
      } catch (err) {
        console.error(err);
        setRepoLoadError(
          err instanceof Error ? err.message : "Failed to fetch repos",
        );
      } finally {
        setIsReposLoading(false);
      }
    }
    fetchRepos();
  }, [selectedRepo, setSelectedRepo]);

  const handleRepoChange = (repoId: string) => {
    const repo = repos.find((r) => r.id.toString() === repoId);
    if (repo) setSelectedRepo(repo);
  };

  const selectedRepoId = selectedRepo ? selectedRepo.id.toString() : "";

  return (
    <div className="flex flex-col gap-3 bg-slate-100 p-4 rounded-xl border border-slate-300 shadow-sm ">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
            <GitBranch className="h-4 w-4 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Active Repository
          </p>
        </div>
        {selectedRepo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
            asChild
          >
            <a href={selectedRepo.url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View on GitHub
            </a>
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <select
          disabled={isReposLoading}
          value={selectedRepoId}
          onChange={(e) => handleRepoChange(e.target.value)}
          className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-8 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        >
          {isReposLoading ? (
            <option value="">Loading repositories…</option>
          ) : repos.length === 0 ? (
            <option value="">No repositories found</option>
          ) : (
            repos.map((repo) => (
              <option key={repo.id} value={repo.id.toString()}>
                {repo.name}
                {repo.private ? " 🔒" : ""}
              </option>
            ))
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-4 w-4 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {repoLoadError && (
        <p
          className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg"
          role="alert"
        >
          {repoLoadError}
        </p>
      )}
    </div>
  );
}
