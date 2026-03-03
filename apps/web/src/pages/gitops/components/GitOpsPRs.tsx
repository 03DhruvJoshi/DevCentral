import { useState, useEffect } from "react";

import { GitPullRequest, Loader2, Calendar } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar.js";
import {
  type Repository,
  type PullRequest,
  token,
  API_BASE_URL,
} from "./types.js";

export default function GitOpsPRs(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [isPrsLoading, setIsPrsLoading] = useState(false);

  // --- 2. Fetch PRs when Selected Repo Changes ---
  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchPrs() {
      setIsPrsLoading(true);
      try {
        // Construct the URL: /api/github/repos/:owner/:repo/pulls
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/pulls`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  return (
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
                        <AvatarFallback>{pr.user.login[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {pr.user.login}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pr.state === "open" ? "default" : "secondary"}
                      className={pr.state === "open" ? "bg-green-600" : ""}
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
                      <a href={pr.html_url} target="_blank" rel="noreferrer">
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
  );
}
