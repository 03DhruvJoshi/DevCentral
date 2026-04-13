import { useState, useEffect, useMemo } from "react";
import {
  GitCommit,
  Loader2,
  Calendar,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Button } from "../../../../components/ui/button.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/avatar.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip.js";
import {
  TableControls,
  TruncatedText,
  PaginationControls,
} from "../TableControls.js";
import { type Repository, type Commit, token, API_BASE_URL } from "../types.js";

type SortKey = "sha" | "message" | "author" | "date";
type SortDir = "asc" | "desc";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== col)
    return <ChevronsUpDown className="h-3 w-3 ml-1 text-slate-400 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp className="h-3 w-3 ml-1 text-slate-700 inline" />
  ) : (
    <ChevronDown className="h-3 w-3 ml-1 text-slate-700 inline" />
  );
}

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
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string, bv: string;
      switch (sortKey) {
        case "sha":
          av = a.sha;
          bv = b.sha;
          break;
        case "message":
          av = commitTitle(a.commit.message).toLowerCase();
          bv = commitTitle(b.commit.message).toLowerCase();
          break;
        case "author":
          av = (a.author?.login ?? a.commit.author.name).toLowerCase();
          bv = (b.author?.login ?? b.commit.author.name).toLowerCase();
          break;
        case "date":
          av = a.commit.author.date;
          bv = b.commit.author.date;
          break;
        default:
          return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const thClass = "text-xs font-bold text-slate-500 uppercase tracking-wide";

  return (
    <Card className="border-slate-300">
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
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <GitCommit className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {commits.length === 0
                    ? "No commits found for this repository."
                    : "No results match your search."}
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="max-h-[34rem] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                        <tr className="border-b border-slate-200 hover:bg-transparent">
                          <th className={`px-4 py-3 text-left ${thClass}`}>
                            <button
                              onClick={() => toggleSort("sha")}
                              className="flex items-center hover:text-slate-700 transition-colors"
                            >
                              SHA{" "}
                              <SortIcon
                                col="sha"
                                sortKey={sortKey}
                                sortDir={sortDir}
                              />
                            </button>
                          </th>
                          <th className={`px-4 py-3 text-left ${thClass}`}>
                            <button
                              onClick={() => toggleSort("message")}
                              className="flex items-center hover:text-slate-700 transition-colors"
                            >
                              Message{" "}
                              <SortIcon
                                col="message"
                                sortKey={sortKey}
                                sortDir={sortDir}
                              />
                            </button>
                          </th>
                          <th className={`px-4 py-3 text-left ${thClass}`}>
                            <button
                              onClick={() => toggleSort("author")}
                              className="flex items-center hover:text-slate-700 transition-colors"
                            >
                              Author{" "}
                              <SortIcon
                                col="author"
                                sortKey={sortKey}
                                sortDir={sortDir}
                              />
                            </button>
                          </th>
                          <th className={`px-4 py-3 text-left ${thClass}`}>
                            <button
                              onClick={() => toggleSort("date")}
                              className="flex items-center hover:text-slate-700 transition-colors"
                            >
                              Date{" "}
                              <SortIcon
                                col="date"
                                sortKey={sortKey}
                                sortDir={sortDir}
                              />
                            </button>
                          </th>
                          <th className={`px-4 py-3 text-right ${thClass}`}>
                            Link
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginated.map((commit) => (
                          <tr
                            key={commit.sha}
                            className="border-0 transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={commit.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                                  >
                                    {commit.sha.slice(0, 7)}
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>{commit.sha}</TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="max-w-[320px] px-4 py-3 font-medium">
                              <TruncatedText
                                text={commitTitle(commit.commit.message)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {commit.author ? (
                                  <>
                                    <Avatar className="h-6 w-6 ring-1 ring-slate-200">
                                      <AvatarImage
                                        src={commit.author.avatar_url}
                                      />
                                      <AvatarFallback className="text-[10px]">
                                        {commit.author.login[0]?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {commit.author.login}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {commit.commit.author.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  commit.commit.author.date,
                                ).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                                asChild
                              >
                                <a
                                  href={commit.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View
                                </a>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TooltipProvider>
            )}
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={sorted.length}
              rowsPerPage={rowsPerPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
