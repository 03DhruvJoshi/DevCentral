// apps/web/src/features/gitops/GitOpsPage.tsx

import { useState, useEffect } from "react";
import {
  GitBranch,
  GitPullRequest,
  ShieldAlert,
  Github,
  ExternalLink,
  Lock,
  Loader2,
  Calendar,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar.js";

// --- Types ---
interface Repository {
  id: number;
  name: string;
  owner: string; // Needed for API call
  url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: string;
  html_url: string;
  created_at: string;
}

interface Pipeline {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  created_at: string;
  run_number: number;
}

interface Release {
  id: number;
  name: string;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  html_url: string;
}

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

export function GitOpsPage() {
  // --- State ---
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [releases, setReleases] = useState<Release[]>([]); // For future use
  const [isPrsLoading, setIsPrsLoading] = useState(false);
  const [isPipelinesLoading, setIsPipelinesLoading] = useState(false);
  const [isReleasesLoading, setIsReleasesLoading] = useState(false);
  const [isReposLoading, setIsReposLoading] = useState(true);

  // --- 1. Fetch Repositories on Mount ---
  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/github/repos`);
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
  }, []);

  // --- 2. Fetch PRs when Selected Repo Changes ---
  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchPrs() {
      setIsPrsLoading(true);
      try {
        // Construct the URL: /api/github/repos/:owner/:repo/pulls
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/pulls`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch PRs");
        const data = await res.json();
        setPrs(data);
      } catch (err) {
        console.error(err);
        setPrs([]); // Clear PRs on error
      } finally {
        setIsPrsLoading(false);
      }
    }

    fetchPrs();
  }, [selectedRepo]); // Runs whenever the dropdown selection changes

  // fetch pipelines

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchPipelines() {
      setIsPipelinesLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/actions`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch actions");
        const data = await res.json();
        setPipelines(data.workflow_runs);
      } catch (err) {
        console.error(err);
        setPipelines([]);
      } finally {
        setIsPipelinesLoading(false);
      }
    }

    fetchPipelines();
  }, [selectedRepo]);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchReleases() {
      setIsReleasesLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/releases`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch releases");
        const data = await res.json();
        setReleases(data);
      } catch (err) {
        console.error(err);
        setReleases([]);
      } finally {
        setIsReleasesLoading(false);
      }
    }

    fetchReleases();
  }, [selectedRepo]);

  // --- Handlers ---
  const handleRepoChange = (repoId: string) => {
    const repo = repos.find((r) => r.id.toString() === repoId);
    if (repo) setSelectedRepo(repo);
  };

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

      {/* REPO SELECTOR DROPDOWN */}
      <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-lg border">
        <label className="text-sm font-medium text-muted-foreground">
          Select Active Repository
        </label>
        <div className="flex items-center gap-4">
          <Select disabled={isReposLoading} onValueChange={handleRepoChange}>
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

      {/* CONTEXTUAL TABS (Only show if a repo is selected) */}
      {selectedRepo ? (
        <Tabs defaultValue="prs" className="w-full">
          <TabsList className="grid w-auto max-w-xlg grid-cols-3">
            <TabsTrigger value="prs">Pull Requests</TabsTrigger>
            <TabsTrigger value="pipelines">CI/CD Pipelines</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
          </TabsList>
          {/* === TAB 1: PULL REQUESTS === */}
          <TabsContent value="prs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-purple-600" />
                  Active Pull Requests
                </CardTitle>
                <CardDescription>
                  Showing recent PRs for <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPrsLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    Fetching Pull Requests...
                  </div>
                ) : prs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <GitPullRequest className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No active pull requests found for this repository.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PR #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prs.map((pr) => (
                        <TableRow key={pr.id}>
                          <TableCell className="font-mono text-xs">
                            #{pr.number}
                          </TableCell>
                          <TableCell className="font-medium">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              className="hover:underline text-primary"
                            >
                              {pr.title}
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={pr.user.avatar_url} />
                                <AvatarFallback>
                                  {pr.user.login[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {pr.user.login}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pr.state === "open" ? "default" : "secondary"
                              }
                              className={
                                pr.state === "open" ? "bg-green-600" : ""
                              }
                            >
                              {pr.state}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(pr.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={pr.html_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Review
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipelines" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-purple-600" />
                  CI-CD Status
                </CardTitle>
                <CardDescription>
                  Showing recent Pipelines for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPipelinesLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    Fetching CI-CD Pipelines...
                  </div>
                ) : pipelines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <GitPullRequest className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No CI-CD Pipelines found for this repository.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run #</TableHead>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Triggered by</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pipelines.map((pipeline) => (
                        <TableRow key={pipeline.id}>
                          <TableCell className="font-mono text-xs">
                            #{pipeline.run_number}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <a
                                href={pipeline.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline text-primary"
                              >
                                {pipeline.name}
                              </a>
                              <span className="text-xs text-muted-foreground">
                                on {pipeline.event}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={pipeline.actor.avatar_url} />
                                <AvatarFallback>
                                  {pipeline.actor.login[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {pipeline.actor.login}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                pipeline.created_at,
                              ).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pipeline.conclusion === "success"
                                  ? "default"
                                  : pipeline.conclusion === "failure"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={
                                pipeline.conclusion === "success"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : ""
                              }
                            >
                              {pipeline.status === "completed"
                                ? pipeline.conclusion
                                : pipeline.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <GitBranch className="h-3 w-3 text-muted-foreground" />
                              <code>{pipeline.head_branch}</code>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={pipeline.html_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Review
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="releases" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-purple-600" />
                  Releases
                </CardTitle>
                <CardDescription>
                  Showing recent Releases for{" "}
                  <strong>{selectedRepo.name}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isReleasesLoading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    Fetching Releases...
                  </div>
                ) : releases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <GitPullRequest className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No Releases found for this repository.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Release #</TableHead>
                        <TableHead>Release</TableHead>
                        <TableHead>Tag Name</TableHead>
                        <TableHead>Draft</TableHead>
                        <TableHead>Prerelease</TableHead>

                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {releases.map((release, index) => (
                        <TableRow key={release.id}>
                          <TableCell className="font-mono text-xs">
                            #{releases.length - index}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {release.name || release.tag_name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {release.tag_name}
                          </TableCell>
                          <TableCell>
                            {release.draft ? (
                              <Badge variant="outline">Draft</Badge>
                            ) : (
                              <Badge variant="secondary">Published</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {release.prerelease ? (
                              <Badge variant="outline">Prerelease</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {release.html_url ? (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={release.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
