import { useMemo, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Activity,
  ListFilter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";

import { Badge } from "../../../../../components/ui/badge.js";

import type CICD from "../types.js";

export default function ReliabilityTab({
  cicd,
  failureReasonData,
}: {
  cicd: CICD;
  failureReasonData: any;
}) {
  const WORKFLOW_NAME_LIMIT = 34;

  const shortenWorkflowName = (workflow: string) => {
    if (workflow.length <= WORKFLOW_NAME_LIMIT) {
      return workflow;
    }
    return `${workflow.slice(0, WORKFLOW_NAME_LIMIT)}...`;
  };

  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [attemptFilter, setAttemptFilter] = useState("all");
  const [logFilter, setLogFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const workflowOptions = useMemo(() => {
    return Array.from(
      new Set(
        cicd.flaky_workflows
          .map((f) => f.workflow)
          .filter((w): w is string => Boolean(w)),
      ),
    );
  }, [cicd.flaky_workflows]);

  const filteredFlakes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cicd.flaky_workflows.filter((flake) => {
      const workflow = flake.workflow ?? "unknown pipeline";
      const matchesWorkflow =
        workflowFilter === "all" || workflow === workflowFilter;
      const matchesAttempts =
        attemptFilter === "all" ||
        (attemptFilter === "2" && flake.runs === 2) ||
        (attemptFilter === "3" && flake.runs === 3) ||
        (attemptFilter === "4+" && flake.runs >= 4);
      const hasLogs = Boolean(flake.url);
      const matchesLogFilter =
        logFilter === "all" ||
        (logFilter === "with_logs" && hasLogs) ||
        (logFilter === "without_logs" && !hasLogs);
      const matchesSearch =
        q.length === 0 ||
        workflow.toLowerCase().includes(q) ||
        flake.head_sha.toLowerCase().includes(q) ||
        String(flake.runs).includes(q);

      return (
        matchesWorkflow && matchesAttempts && matchesLogFilter && matchesSearch
      );
    });
  }, [cicd.flaky_workflows, workflowFilter, attemptFilter, logFilter, search]);

  const ROWS_PER_PAGE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlakes.length / ROWS_PER_PAGE),
  );
  const pagedFlakes = filteredFlakes.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  const visiblePages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).slice(Math.max(0, page - 3), page + 2);

  const setPageSafely = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  return (
    <>
      <Card className="border-slate-200 shadow-sm bg-slate-50">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <Activity className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={workflowFilter}
              onChange={(e) => {
                setWorkflowFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All workflows</option>
              {workflowOptions.map((workflow) => (
                <option key={workflow} value={workflow}>
                  {workflow}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <ListFilter className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={attemptFilter}
              onChange={(e) => {
                setAttemptFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All attempt counts</option>
              <option value="2">2 attempts</option>
              <option value="3">3 attempts</option>
              <option value="4+">4+ attempts</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={logFilter}
              onChange={(e) => {
                setLogFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All log states</option>
              <option value="with_logs">With logs</option>
              <option value="without_logs">Without logs</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Workflow, commit SHA, attempts..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="px-5 border-b border-slate-200 bg-white flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              {filteredFlakes.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <div>
              <CardTitle
                className={`text-sm flex items-center gap-2 ${filteredFlakes.length > 0 ? "text-rose-800" : "text-emerald-800"}`}
              >
                Non-Deterministic Workflows (Flaky Tests)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 text-slate-500">
                Workflows that failed then succeeded on the same commit without
                code changes. Failure categories observed:{" "}
                {failureReasonData.length}.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-slate-200 text-slate-600 shrink-0"
          >
            {filteredFlakes.length} flaky run
            {filteredFlakes.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <CardContent className="p-0 bg-slate-50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-semibold">Workflow</th>
                  <th className="py-2.5 px-4 font-semibold">Commit</th>
                  <th className="py-2.5 px-4 font-semibold">Attempts</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedFlakes.length > 0 ? (
                  pagedFlakes.map((flake) => {
                    const workflowName = flake.workflow || "Unknown Pipeline";
                    const isLongWorkflow =
                      workflowName.length > WORKFLOW_NAME_LIMIT;

                    return (
                      <tr
                        key={`${flake.head_sha}-${flake.workflow ?? "workflow"}`}
                        className="bg-slate-50 hover:bg-white transition-colors"
                      >
                        <td className="py-2.5 px-4 text-slate-800 font-medium">
                          <span>{shortenWorkflowName(workflowName)}</span>
                          {isLongWorkflow && flake.url ? (
                            <>
                              {" "}
                              <a
                                href={flake.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 underline decoration-indigo-300 underline-offset-2"
                              >
                                Read more
                              </a>
                            </>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {flake.head_sha.substring(0, 7)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {flake.runs}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            FLAKY
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          {flake.url ? (
                            <a
                              href={flake.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-slate-400"
                    >
                      No flaky workflow runs match your selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page{" "}
              <span className="font-medium text-slate-700">{page}</span> of{" "}
              <span className="font-medium text-slate-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
                onClick={() => setPageSafely(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                    p === page
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
                onClick={() => setPageSafely(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
