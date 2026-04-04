import { useState, useEffect } from "react";
import { GitBranch, ExternalLink, Lock } from "lucide-react";
import { Button } from "../../../components/ui/button.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

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
        if (!token) {
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

        // Default to the first repo if available
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

  // --- Handlers ---
  const handleRepoChange = (repoId: string) => {
    const repo = repos.find((r) => r.id.toString() === repoId);
    if (repo) setSelectedRepo(repo);
  };

  const selectedRepoId = selectedRepo ? selectedRepo.id.toString() : "";

  return (
    <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-lg border">
      <p className="text-sm font-medium text-muted-foreground">
        Select Active Repository
      </p>
      <div className="flex items-center gap-4">
        <Select
          disabled={isReposLoading}
          onValueChange={handleRepoChange}
          value={selectedRepoId}
        >
          <SelectTrigger className="w-[300px] bg-white">
            <SelectValue
              placeholder={
                isReposLoading ? "Loading repos..." : "Select a repository"
              }
            />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {repos.map((repo) => (
              <SelectItem key={repo.id} value={repo.id.toString()}>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span>{repo.name}</span>
                  {repo.private && (
                    <Lock className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Optional: View on GitHub Button for currently selected repo */}
        {selectedRepo && (
          <Button variant="ghost" size="sm" asChild>
            <a href={selectedRepo.url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        )}
      </div>
      {repoLoadError && (
        <p className="text-xs text-red-600" role="alert">
          {repoLoadError}
        </p>
      )}
    </div>
  );
}
