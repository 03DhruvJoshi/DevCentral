import { useState, useEffect, useMemo } from "react";
import {
  GitPullRequest,
  Loader2,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ExternalLink,
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
import {
  type Repository,
  type PullRequest,
  token,
  API_BASE_URL,
} from "../types.js";

type SortKey = "number" | "title" | "author" | "state" | "created";
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

export default function GitOpsPRs(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
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
          av = a.user.login.toLowerCase();
          bv = b.user.login.toLowerCase();
          break;
        case "state":
          av = a.state;
          bv = b.state;
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
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="all">All States</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              }
            />

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <GitPullRequest className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {prs.length === 0
                    ? "No pull requests found for this repository."
                    : "No results match your filters."}
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
                            PR #{" "}
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
                            State{" "}
                            <SortIcon
                              col="state"
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
                      {paginated.map((pr) => (
                        <tr
                          key={pr.id}
                          className="border-0 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            #{pr.number}
                          </td>
                          <td className="max-w-[280px] px-4 py-3 font-medium">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline text-slate-800 hover:text-slate-900"
                            >
                              <TruncatedText text={pr.title} />
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 ring-1 ring-slate-200">
                                <AvatarImage src={pr.user.avatar_url} />
                                <AvatarFallback className="text-[10px]">
                                  {pr.user.login[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {pr.user.login}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {pr.state === "open" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Closed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(pr.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200"
                              asChild
                            >
                              <a
                                href={pr.html_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
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
