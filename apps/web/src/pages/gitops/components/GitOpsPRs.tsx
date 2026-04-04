import { useState, useEffect, useMemo } from "react";
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
  type PullRequest,
  token,
  API_BASE_URL,
} from "./types.js";

export default function GitOpsPRs(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    setSearch("");
    setPage(1);

    async function fetchPrs() {
      setIsLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/pulls?per_page=50`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch PRs");
        const data = await res.json();
        setPrs(data);
      } catch (err) {
        console.error(err);
        setPrs([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrs();
  }, [selectedRepo]);

  const filtered = useMemo(() => {
    return prs.filter((pr) => {
      const matchesSearch =
        search === "" ||
        pr.title.toLowerCase().includes(search.toLowerCase()) ||
        pr.user.login.toLowerCase().includes(search.toLowerCase());
      const matchesState = stateFilter === "all" || pr.state === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [prs, search, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-purple-600" />
          Pull Requests
        </CardTitle>
        <CardDescription>
          Showing pull requests for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching Pull Requests...
          </div>
        ) : (
          <>
            <TableControls
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by title or author..."
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              onPageChange={setPage}
              extraFilters={
                <Select
                  value={stateFilter}
                  onValueChange={(v) => {
                    setStateFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {paginated.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <GitPullRequest className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {prs.length === 0
                  ? "No pull requests found for this repository."
                  : "No results match your filters."}
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
                  {paginated.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-mono text-xs">
                        #{pr.number}
                      </TableCell>
                      <TableCell className="font-medium max-w-[280px]">
                        <a
                          href={pr.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-primary"
                        >
                          <TruncatedText text={pr.title} />
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
                          variant={
                            pr.state === "open" ? "default" : "secondary"
                          }
                          className={
                            pr.state === "open"
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
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
