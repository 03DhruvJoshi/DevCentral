import {
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
import type { RegisterRow, RegisterSortField } from "../types.js";
import { getStateBadgeClass, getRiskBadgeClass } from "../utlities.js";

export default function ActivityLogTab({
  paginatedRegister,
  filteredRegister,
  toggleSort,
  renderSortIcon,

  registerPage,
  setRegisterPage,
  totalRegisterPages,
}: {
  paginatedRegister: RegisterRow[];
  filteredRegister: RegisterRow[];
  toggleSort: (field: RegisterSortField) => void;
  renderSortIcon: (field: RegisterSortField) => React.ReactNode;

  registerPage: number;
  setRegisterPage: React.Dispatch<React.SetStateAction<number>>;
  totalRegisterPages: number;
}) {
  const visiblePages = Array.from(
    { length: totalRegisterPages },
    (_, i) => i + 1,
  ).slice(Math.max(0, registerPage - 3), registerPage + 2);

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="px-5   border-b border-slate-200 bg-white flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
            <GitBranch className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <CardTitle className="text-sm text-slate-900">
              Open Issue Register
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-slate-500">
              Detailed PR register with branch, risk, size, review depth, and
              age.
            </CardDescription>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-xs border-slate-200 text-slate-600 shrink-0"
        >
          {filteredRegister.length} PR{filteredRegister.length === 1 ? "" : "s"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 bg-slate-50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50">
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("number")}
                  >
                    PR {renderSortIcon("number")}
                  </button>
                </th>
                <th className="py-2.5 px-4 font-semibold">Title</th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("state")}
                  >
                    State {renderSortIcon("state")}
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("risk")}
                  >
                    Risk {renderSortIcon("risk")}
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("branch")}
                  >
                    Branch {renderSortIcon("branch")}
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("size")}
                  >
                    Size {renderSortIcon("size")}
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("reviews")}
                  >
                    Reviews {renderSortIcon("reviews")}
                  </button>
                </th>
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold"
                    onClick={() => toggleSort("age")}
                  >
                    Age {renderSortIcon("age")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRegister.length > 0 ? (
                paginatedRegister.map((pr) => (
                  <tr
                    key={`register-${pr.number}`}
                    className="border-b border-slate-100 align-top bg-slate-50 hover:bg-white transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      #{pr.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[320px]">
                        <p className="font-medium text-slate-800 line-clamp-2">
                          {pr.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>@{pr.author ?? "unknown"}</span>
                          <span>•</span>
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={getStateBadgeClass(pr.state)}
                      >
                        {pr.state}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={getRiskBadgeClass(pr.risk_level)}
                      >
                        {pr.risk_level} ({pr.risk_score})
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">
                      {pr.base_branch}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {pr.total_changes}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {pr.review_count} ({pr.approvals} approvals)
                    </td>
                    <td className="py-3 px-4 text-slate-700">{pr.age_days}d</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No PRs match the selected filters.
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
            <span className="font-medium text-slate-700">
              {totalRegisterPages}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
              onClick={() => setRegisterPage((p) => Math.max(1, p - 1))}
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
                setRegisterPage((p) => Math.min(totalRegisterPages, p + 1))
              }
              disabled={registerPage >= totalRegisterPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
