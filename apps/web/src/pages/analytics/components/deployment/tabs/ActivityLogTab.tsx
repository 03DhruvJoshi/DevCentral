import { useState, useMemo } from "react";
import {
  GitBranch,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Badge } from "../../../../../components/ui/badge.js";
import {
  type DeploymentAnalyticsData,
  type EnvFilter,
  type ProviderFilter,
  type StatusFilter,
} from "../types.js";
import {
  StatusBadge,
  ProviderIcon,
  formatAbsDate,
  formatDuration,
  formatRelativeTime,
} from "../utilities.js";

const PAGE_SIZE = 10;

type SortCol =
  | "startedAt"
  | "provider"
  | "status"
  | "branch"
  | "environment"
  | "durationSec";

export default function ActivityLogTab({
  filteredRecent,
  providerFilter,
  envFilter,
  statusFilter,
}: {
  filteredRecent: DeploymentAnalyticsData["recentDeployments"];
  providerFilter: ProviderFilter;
  envFilter: EnvFilter;
  statusFilter: StatusFilter;
}) {
  const [sortCol, setSortCol] = useState<SortCol>("startedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "startedAt" ? "desc" : "asc");
    }
    setPage(0);
  }

  const sorted = useMemo(() => {
    return [...filteredRecent].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortCol) {
        case "startedAt":
          aVal = new Date(a.startedAt).getTime();
          bVal = new Date(b.startedAt).getTime();
          break;
        case "durationSec":
          aVal = a.durationSec ?? -1;
          bVal = b.durationSec ?? -1;
          break;
        default:
          aVal = (a as unknown as Record<string, string | number>)[sortCol] ?? "";
          bVal = (b as unknown as Record<string, string | number>)[sortCol] ?? "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRecent, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col)
      return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-indigo-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-indigo-600" />
    );
  }

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i).slice(
    Math.max(0, page - 2),
    page + 3,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
            <GitBranch className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Deployment Activity Log
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Full deployment history — sort by any column. Use filters above to
              narrow results.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-slate-200 text-slate-600 shrink-0"
        >
          {filteredRecent.length} deployment
          {filteredRecent.length !== 1 ? "s" : ""}
          {providerFilter !== "all" && ` · ${providerFilter}`}
          {envFilter !== "all" && ` · ${envFilter}`}
          {statusFilter !== "all" && ` · ${statusFilter}`}
        </Badge>
      </div>

      {filteredRecent.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <GitBranch className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">
            No deployments match the current filters.
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting the filters above to see results.
          </p>
        </div>
      ) : (
        <>
          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2.5 px-4 text-left">
                    <button
                      onClick={() => handleSort("provider")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Provider <SortIcon col="provider" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Status <SortIcon col="status" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-left">
                    <button
                      onClick={() => handleSort("branch")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Branch <SortIcon col="branch" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-left">
                    <button
                      onClick={() => handleSort("environment")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Environment <SortIcon col="environment" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-left font-semibold text-slate-500 hidden md:table-cell">
                    Commit
                  </th>
                  <th className="py-2.5 px-4 text-left">
                    <button
                      onClick={() => handleSort("startedAt")}
                      className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Date <SortIcon col="startedAt" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleSort("durationSec")}
                      className="flex items-center gap-1 ml-auto font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Duration <SortIcon col="durationSec" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 text-center font-semibold text-slate-500">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((dep) => (
                  <tr
                    key={dep.id}
                    className="hover:bg-white transition-colors bg-slate-50"
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`inline-flex items-center justify-center p-1.5 rounded-md ${dep.provider === "vercel" ? "bg-slate-100" : "bg-emerald-50"}`}
                      >
                        <ProviderIcon provider={dep.provider} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={dep.status} />
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="font-mono text-slate-600 truncate max-w-[140px] block"
                        title={dep.branch}
                      >
                        {dep.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className="text-xs capitalize border-slate-200 text-slate-600"
                      >
                        {dep.environment}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {dep.commitMessage ? (
                        <span
                          className="truncate max-w-[200px] block text-slate-600"
                          title={dep.commitMessage}
                        >
                          {dep.commitMessage}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                      {dep.commitSha && (
                        <span className="font-mono text-slate-400 text-[10px]">
                          {dep.commitSha.slice(0, 7)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-700">
                        {formatAbsDate(dep.startedAt)}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {formatRelativeTime(dep.startedAt)}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-slate-700">
                        {formatDuration(dep.durationSec)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {dep.url ? (
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex justify-center"
                          title="Open deployment"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, sorted.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">{sorted.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {visiblePages.map((i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-7 w-7 text-xs rounded-md border transition-colors ${
                    i === page
                      ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
