import { useState, useEffect, useMemo } from "react";
import { GitCommit, Loader2, Calendar, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip.js";
import {
  TableControls,
  TruncatedText,
  PaginationControls,
} from "./TableControls.js";
import { type Repository, type Commit, token, API_BASE_URL } from "./types.js";

function commitTitle(message: string) {
  return message.split("\n")[0];
}

export default function GitOpsCommits(
  props: Readonly<{ selectedRepo: Repository }>,
) {
  const { selectedRepo } = props;
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    setSearch("");
    setPage(1);

    async function fetchCommits() {
      setIsLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/commits?per_page=50`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch commits");
        const data = await res.json();
        setCommits(data);
      } catch (err) {
        console.error(err);
        setCommits([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommits();
  }, [selectedRepo]);

  const filtered = useMemo(() => {
    if (search === "") return commits;
    const q = search.toLowerCase();
    return commits.filter(
      (c) =>
        c.commit.message.toLowerCase().includes(q) ||
        c.commit.author.name.toLowerCase().includes(q) ||
        (c.author?.login ?? "").toLowerCase().includes(q) ||
        c.sha.startsWith(q),
    );
  }, [commits, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  // Extract first line of commit message

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="h-5 w-5 text-emerald-600" />
          Recent Commits
        </CardTitle>
        <CardDescription>
          Showing commit history for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching commits...
          </div>
        ) : (
          <>
            <TableControls
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by message, author, or SHA..."
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              onPageChange={setPage}
            />

            {paginated.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <GitCommit className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {commits.length === 0
                  ? "No commits found for this repository."
                  : "No results match your search."}
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SHA</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((commit) => (
                      <TableRow key={commit.sha}>
                        <TableCell className="font-mono text-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={commit.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {commit.sha.slice(0, 7)}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>{commit.sha}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium max-w-[320px]">
                          <TruncatedText
                            text={commitTitle(commit.commit.message)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {commit.author ? (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={commit.author.avatar_url} />
                                  <AvatarFallback>
                                    {commit.author.login[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">
                                  {commit.author.login}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {commit.commit.author.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(
                              commit.commit.author.date,
                            ).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={commit.html_url}
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
              </TooltipProvider>
            )}
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
              rowsPerPage={rowsPerPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
