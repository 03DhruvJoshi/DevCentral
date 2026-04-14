import {
  Search,
  Activity,
  ServerCrash,
  ExternalLink,
  GitBranch,
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

import {
  formatDuration,
  formatDateTime,
  getConclusionBadgeClass,
} from "../utilities.js";

export default function AnalyticsLogTab({
  setWorkflowFilter,
  setBranchFilter,
  setConclusionFilter,
  workflowFilter,
  branchOptions,
  branchFilter,
  conclusionOptions,
  pagedRegister,
  workflowOptions,
  conclusionFilter,
  search,
  setSearch,
  filteredRegister,
  registerPage,
  setRegisterPage,
  totalPages,
}: {
  setWorkflowFilter: any;
  setBranchFilter: any;
  setConclusionFilter: any;
  workflowFilter: any;
  branchOptions: any;
  branchFilter: any;
  conclusionOptions: any;
  pagedRegister: any;
  workflowOptions: any;
  conclusionFilter: any;
  search: any;
  setSearch: any;
  filteredRegister: any;
  registerPage: any;
  setRegisterPage: any;
  totalPages: any;
}) {
  const WORKFLOW_NAME_LIMIT = 34;

  const shortenWorkflowName = (workflow: string) => {
    if (workflow.length <= WORKFLOW_NAME_LIMIT) {
      return workflow;
    }
    return `${workflow.slice(0, WORKFLOW_NAME_LIMIT)}...`;
  };

  const visiblePages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).slice(Math.max(0, registerPage - 3), registerPage + 2);

  return (
    <>
      <Card className="border-slate-200 shadow-sm bg-slate-50">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <Activity className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
            >
              <option value="all">All workflows</option>
              {workflowOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <GitBranch className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All branches</option>
              {branchOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <ServerCrash className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={conclusionFilter}
              onChange={(e) => setConclusionFilter(e.target.value)}
            >
              <option value="all">All conclusions</option>
              {conclusionOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Run ID, actor, event..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="px-5   border-b border-slate-200 bg-white flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <Activity className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-sm text-slate-900">
                Run Register
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 text-slate-500">
                Full run-level telemetry: workflow, trigger, actor, queue time,
                execution time, and final result.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-slate-200 text-slate-600 shrink-0"
          >
            {filteredRegister.length} run
            {filteredRegister.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 bg-slate-50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-semibold">Run</th>
                  <th className="py-2.5 px-4 font-semibold">Workflow</th>
                  <th className="py-2.5 px-4 font-semibold">Branch</th>
                  <th className="py-2.5 px-4 font-semibold">Event</th>
                  <th className="py-2.5 px-4 font-semibold">Conclusion</th>
                  <th className="py-2.5 px-4 font-semibold">Queue</th>
                  <th className="py-2.5 px-4 font-semibold">Exec</th>
                  <th className="py-2.5 px-4 font-semibold">Actor</th>
                  <th className="py-2.5 px-4 font-semibold">Started</th>
                  <th className="py-2.5 px-4 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRegister.length > 0 ? (
                  pagedRegister.map((run: any) => {
                    const normalizedConclusion =
                      run.conclusion ?? "in_progress";
                    const workflowName = run.workflow ?? "Unknown Workflow";
                    const isLongWorkflow =
                      workflowName.length > WORKFLOW_NAME_LIMIT;
                    return (
                      <tr
                        key={run.run_id}
                        className="bg-slate-50 hover:bg-white transition-colors"
                      >
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          #{run.run_id}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <span>{shortenWorkflowName(workflowName)}</span>
                          {isLongWorkflow && run.url ? (
                            <>
                              {" "}
                              <a
                                href={run.url}
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
                          {run.branch}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {run.event}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`capitalize ${getConclusionBadgeClass(normalizedConclusion)}`}
                          >
                            {normalizedConclusion}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {formatDuration(run.queue_min)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {formatDuration(run.exec_min)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {run.actor ?? "-"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {formatDateTime(run.created_at)}
                        </td>
                        <td className="py-2.5 px-4">
                          <a
                            href={run.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-slate-400"
                    >
                      No runs match your selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page{" "}
              <span className="font-medium text-slate-700">{registerPage}</span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
                onClick={() =>
                  setRegisterPage((p: number) => Math.max(1, p - 1))
                }
                disabled={registerPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRegisterPage(p)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                    p === registerPage
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
                onClick={() =>
                  setRegisterPage((p: number) => Math.min(totalPages, p + 1))
                }
                disabled={registerPage >= totalPages}
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
