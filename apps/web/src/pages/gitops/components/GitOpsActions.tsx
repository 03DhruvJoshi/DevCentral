import { useState, useEffect, useMemo } from "react";
import { Workflow, Loader2, Calendar, GitBranch } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import {
  TableControls,
  TruncatedText,
  PaginationControls,
} from "./TableControls.js";
import {
  type Repository,
  type Pipeline,
  token,
  API_BASE_URL,
} from "./types.js";

function conclusionVariant(conclusion: string | null) {
  if (conclusion === "success") return "default";
  if (conclusion === "failure") return "default";
  return "secondary";
}

function conclusionClass(conclusion: string | null) {
  return conclusion === "success"
    ? "bg-green-600 hover:bg-green-700"
    : "bg-red-400 hover:bg-red-500";
}

export default function GitOpsActions(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    setSearch("");
    setPage(1);

    async function fetchPipelines() {
      setIsLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/actions?per_page=50`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch actions");
        const data = await res.json();
        setPipelines(data.workflow_runs ?? []);
      } catch (err) {
        console.error(err);
        setPipelines([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPipelines();
  }, [selectedRepo]);

  const filtered = useMemo(() => {
    return pipelines.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.head_branch.toLowerCase().includes(search.toLowerCase()) ||
        p.actor.login.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "success" && p.conclusion === "success") ||
        (statusFilter === "failure" && p.conclusion === "failure") ||
        (statusFilter === "in_progress" && p.status === "in_progress");
      return matchesSearch && matchesStatus;
    });
  }, [pipelines, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-blue-600" />
          CI/CD Pipelines
        </CardTitle>
        <CardDescription>
          Showing workflow runs for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching CI/CD Pipelines...
          </div>
        ) : (
          <>
            <TableControls
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by workflow, branch, or actor..."
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              onPageChange={setPage}
              extraFilters={
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {paginated.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Workflow className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {pipelines.length === 0
                  ? "No CI/CD pipelines found for this repository."
                  : "No results match your filters."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run #</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((pipeline) => (
                    <TableRow key={pipeline.id}>
                      <TableCell className="font-mono text-xs">
                        #{pipeline.run_number}
                      </TableCell>
                      <TableCell className="font-medium max-w-[260px]">
                        <div className="flex flex-col">
                          <a
                            href={pipeline.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline text-primary"
                          >
                            <TruncatedText text={pipeline.name} />
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
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <GitBranch className="h-3 w-3 text-muted-foreground" />
                          <code className="text-xs">
                            {pipeline.head_branch}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={conclusionVariant(pipeline.conclusion)}
                          className={conclusionClass(pipeline.conclusion)}
                        >
                          {pipeline.status === "completed"
                            ? pipeline.conclusion
                            : pipeline.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(pipeline.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={pipeline.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <PaginationControls
              rowsPerPage={rowsPerPage}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
