import { useState, useEffect, useMemo } from "react";
import {
  Workflow,
  Loader2,
  Calendar,
  GitBranch,
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
  type Pipeline,
  token,
  API_BASE_URL,
} from "../types.js";

type SortKey = "run" | "workflow" | "actor" | "branch" | "status" | "date";
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

function StatusPill({
  status,
  conclusion,
}: {
  status: string;
  conclusion: string | null;
}) {
  const isInProgress = status === "in_progress" || status === "queued";
  const label =
    status === "completed"
      ? (conclusion ?? "unknown")
      : status.replace("_", " ");

  if (isInProgress) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
        </span>
        {label}
      </span>
    );
  }
  if (conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        success
      </span>
    );
  }
  if (conclusion === "failure") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {label}
    </span>
  );
}

export default function GitOpsActions(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "run":
          av = a.run_number;
          bv = b.run_number;
          break;
        case "workflow":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "actor":
          av = a.actor.login.toLowerCase();
          bv = b.actor.login.toLowerCase();
          break;
        case "branch":
          av = a.head_branch.toLowerCase();
          bv = b.head_branch.toLowerCase();
          break;
        case "status":
          av = a.conclusion ?? a.status;
          bv = b.conclusion ?? b.status;
          break;
        case "date":
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
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="in_progress">In Progress</option>
                </select>
              }
            />

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <Workflow className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {pipelines.length === 0
                    ? "No CI/CD pipelines found for this repository."
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
                            onClick={() => toggleSort("run")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Run #{" "}
                            <SortIcon
                              col="run"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("workflow")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Workflow{" "}
                            <SortIcon
                              col="workflow"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("actor")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Triggered By{" "}
                            <SortIcon
                              col="actor"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("branch")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Branch{" "}
                            <SortIcon
                              col="branch"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("status")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Status{" "}
                            <SortIcon
                              col="status"
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
                      {paginated.map((pipeline) => (
                        <tr
                          key={pipeline.id}
                          className="border-0 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            #{pipeline.run_number}
                          </td>
                          <td className="max-w-[260px] px-4 py-3 font-medium">
                            <div className="flex flex-col">
                              <a
                                href={pipeline.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline text-slate-800 hover:text-slate-900"
                              >
                                <TruncatedText text={pipeline.name} />
                              </a>
                              <span className="text-[10px] text-muted-foreground">
                                on {pipeline.event}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 ring-1 ring-slate-200">
                                <AvatarImage src={pipeline.actor.avatar_url} />
                                <AvatarFallback className="text-[10px]">
                                  {pipeline.actor.login[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {pipeline.actor.login}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs">
                              <GitBranch className="h-3 w-3 text-muted-foreground" />
                              <code className="text-xs text-slate-700">
                                {pipeline.head_branch}
                              </code>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill
                              status={pipeline.status}
                              conclusion={pipeline.conclusion}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                pipeline.created_at,
                              ).toLocaleDateString()}
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
                                href={pipeline.html_url}
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
