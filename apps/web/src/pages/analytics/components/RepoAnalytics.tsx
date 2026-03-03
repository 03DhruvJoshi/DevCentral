import { useState, useEffect } from "react";
import { GitBranch, Github, ExternalLink, Lock } from "lucide-react";

import { Button } from "../../../components/ui/button.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

import { useNavigate } from "react-router-dom";

import { API_BASE_URL, token } from "./types.js";
import type { Repository } from "./types.js";

interface GitOpsReposProps {
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
}

export default function RepoAnalytics({
  selectedRepo,
  setSelectedRepo,
}: Readonly<GitOpsReposProps>) {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repository[]>([]);

  const [isReposLoading, setIsReposLoading] = useState(true);

  useEffect(() => {
    async function fetchRepos() {
      try {
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch repos");
        const data = await res.json();
        setRepos(data);

        // Default to the first repo if available
        if (data.length > 0) {
          setSelectedRepo(data[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsReposLoading(false);
      }
    }
    fetchRepos();
  }, [navigate]);

  const handleRepoChange = (repoId: string) => {
    const repo = repos.find((r) => r.id.toString() === repoId);
    if (repo) setSelectedRepo(repo);
  };

  const selectedRepoId = selectedRepo ? selectedRepo.id.toString() : "";

  return (
    <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-lg border">
      <label className="text-sm font-medium text-muted-foreground">
        Select Active Repository
      </label>
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
    </div>
  );
}
