import { useState, useEffect, useMemo } from "react";
import {
  CircleDot,
  CheckCircle2,
  Loader2,
  Calendar,
  MessageSquare,
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
  TableControls,
  TruncatedText,
  PaginationControls,
} from "../TableControls.js";
import { type Repository, type Issue, token, API_BASE_URL } from "../types.js";

type SortKey = "number" | "title" | "author" | "state" | "comments" | "created";
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

export default function GitOpsIssues(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("created");
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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "number":
          av = a.number;
          bv = b.number;
          break;
        case "title":
          av = a.title.toLowerCase();
          bv = b.title.toLowerCase();
          break;
        case "author":
          av = (a.user?.login ?? "").toLowerCase();
          bv = (b.user?.login ?? "").toLowerCase();
          break;
        case "state":
          av = a.state;
          bv = b.state;
          break;
        case "comments":
          av = a.comments;
          bv = b.comments;
          break;
        case "created":
          av = a.created_at;
          bv = b.created_at;
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
                <select
                  value={stateFilter}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="all">All</option>
                </select>
              }
            />

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <CircleDot className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {issues.length === 0
                    ? `No ${stateFilter === "all" ? "" : stateFilter} issues found for this repository.`
                    : "No results match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="max-h-[34rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                      <tr className="border-b border-slate-200 hover:bg-transparent">
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("number")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            #{" "}
                            <SortIcon
                              col="number"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("title")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Title{" "}
                            <SortIcon
                              col="title"
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
                            onClick={() => toggleSort("state")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Status{" "}
                            <SortIcon
                              col="state"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("comments")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Comments{" "}
                            <SortIcon
                              col="comments"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("created")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Created{" "}
                            <SortIcon
                              col="created"
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
                      {paginated.map((issue) => (
                        <tr
                          key={issue.id}
                          className="border-0 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            #{issue.number}
                          </td>
                          <td className="max-w-[260px] px-4 py-3 font-medium">
                            <a
                              href={issue.html_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline text-slate-800 hover:text-slate-900"
                            >
                              <TruncatedText text={issue.title} />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {issue.user && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 ring-1 ring-slate-200">
                                  <AvatarImage src={issue.user.avatar_url} />
                                  <AvatarFallback className="text-[10px]">
                                    {issue.user.login[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  {issue.user.login}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {issue.state === "open" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Closed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {issue.comments}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(issue.created_at).toLocaleDateString()}
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
                                href={issue.html_url}
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
            )}
            <PaginationControls
              rowsPerPage={rowsPerPage}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={sorted.length}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
