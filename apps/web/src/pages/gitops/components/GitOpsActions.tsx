import { useState, useEffect } from "react";
import { GitBranch, GitPullRequest, Loader2, Calendar } from "lucide-react";

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
  type Pipeline,
  token,
  API_BASE_URL,
} from "./types.js";

export default function GitOpsActions(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isPipelinesLoading, setIsPipelinesLoading] = useState(false);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchPipelines() {
      setIsPipelinesLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/actions`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-purple-600" />
          CI-CD Status
        </CardTitle>
        <CardDescription>
          Showing recent Pipelines for <strong>{selectedRepo.name}</strong>
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
                      {new Date(pipeline.created_at).toLocaleDateString()}
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
  );
}
