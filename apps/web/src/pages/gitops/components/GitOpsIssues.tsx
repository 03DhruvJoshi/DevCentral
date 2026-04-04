import { useState, useEffect, useMemo } from "react";
import {
  CircleDot,
  CheckCircle2,
  Loader2,
  Calendar,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
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
import { type Repository, type Issue, token, API_BASE_URL } from "./types.js";

export default function GitOpsIssues(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    setSearch("");
    setPage(1);
    fetchIssues(stateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo]);

  async function fetchIssues(state: string) {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/issues?per_page=50&state=${state}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch issues");
      const data = await res.json();
      setIssues(data);
    } catch (err) {
      console.error(err);
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleStateChange(newState: string) {
    setStateFilter(newState);
    setPage(1);
    fetchIssues(newState);
  }

  const filtered = useMemo(() => {
    if (search === "") return issues;
    const q = search.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        (issue.user?.login ?? "").toLowerCase().includes(q) ||
        issue.labels.some((l) => l.name.toLowerCase().includes(q)),
    );
  }, [issues, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-red-500" />
          GitHub Issues
        </CardTitle>
        <CardDescription>
          Showing issues for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching issues...
          </div>
        ) : (
          <>
            <TableControls
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Search by title, author, or label..."
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              onPageChange={setPage}
              extraFilters={
                <Select value={stateFilter} onValueChange={handleStateChange}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {paginated.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <CircleDot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {issues.length === 0
                  ? `No ${stateFilter === "all" ? "" : stateFilter} issues found for this repository.`
                  : "No results match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>

                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-xs">
                        #{issue.number}
                      </TableCell>
                      <TableCell className="font-medium max-w-[260px]">
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-primary"
                        >
                          <TruncatedText text={issue.title} />
                        </a>
                      </TableCell>
                      <TableCell>
                        {issue.user && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={issue.user.avatar_url} />
                              <AvatarFallback>
                                {issue.user.login[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {issue.user.login}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {issue.state === "open" ? (
                          <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                            <CircleDot className="h-3 w-3" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Closed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {issue.comments}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
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
