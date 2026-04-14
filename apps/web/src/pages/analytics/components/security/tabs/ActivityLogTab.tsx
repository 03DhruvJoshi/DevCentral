import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";

import {
  getIssueTypeBadgeClass,
  getSeverityBadgeClass,
  getFileNameFromComponent,
} from "../utilities.js";

export default function ActivityLogTab({
  issueSeverityFilter,
  setIssueSeverityFilter,
  issueTypeFilter,
  setIssueTypeFilter,
  issueSearch,
  setIssueSearch,
  isIssuesLoading,
  issuesError,
  filteredAndSortedIssues,
  paginatedIssues,
  issuePage,
  totalIssuePages,
  setIssuePage,
  toggleSort,
  sortIcon,
}: {
  issueSeverityFilter: any;
  setIssueSeverityFilter: (prop: any) => void;
  issueTypeFilter: any;
  setIssueTypeFilter: (prop: any) => void;
  issueSearch: any;
  setIssueSearch: (prop: any) => void;
  isIssuesLoading: any;
  issuesError: any;
  filteredAndSortedIssues: any;
  paginatedIssues: any;

  issuePage: any;
  totalIssuePages: any;
  setIssuePage: (prop: any) => void;

  toggleSort: any;
  sortIcon: any;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Open Issue Register</CardTitle>
        <CardDescription>
          Issue-level list for triage with severity, type, file, rule and
          message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={issueSeverityFilter}
            onChange={(e) => {
              setIssueSeverityFilter(e.target.value);
              setIssuePage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="BLOCKER">Blocker</option>
            <option value="CRITICAL">Critical</option>
            <option value="MAJOR">Major</option>
            <option value="MINOR">Minor</option>
            <option value="INFO">Info</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <select
            value={issueTypeFilter}
            onChange={(e) => {
              setIssueTypeFilter(e.target.value);
              setIssuePage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All Types</option>
            <option value="VULNERABILITY">Vulnerability</option>
            <option value="BUG">Bug</option>
            <option value="SECURITY_HOTSPOT">Security Hotspot</option>
            <option value="CODE_SMELL">Code Smell</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          <input
            type="text"
            value={issueSearch}
            onChange={(e) => {
              setIssueSearch(e.target.value);
              setIssuePage(1);
            }}
            placeholder="Search file, rule, message..."
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          />
        </div>

        {isIssuesLoading ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading issue-level insights...
          </div>
        ) : issuesError ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
            {issuesError}
          </div>
        ) : filteredAndSortedIssues.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
            No issues match the selected filters.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("severity")}
                      className="flex items-center gap-1"
                    >
                      Severity {sortIcon("severity")}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("type")}
                      className="flex items-center gap-1"
                    >
                      Type {sortIcon("type")}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("file")}
                      className="flex items-center gap-1"
                    >
                      File {sortIcon("file")}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("rule")}
                      className="flex items-center gap-1"
                    >
                      Rule {sortIcon("rule")}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("message")}
                      className="flex items-center gap-1"
                    >
                      Message {sortIcon("message")}
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleSort("line")}
                      className="flex items-center gap-1"
                    >
                      Line {sortIcon("line")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedIssues.map((issue: any) => (
                  <tr
                    key={issue.key}
                    className="border-t border-slate-100 align-top"
                  >
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={getSeverityBadgeClass(issue.severity)}
                      >
                        {issue.severity ?? "UNKNOWN"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={getIssueTypeBadgeClass(issue.type)}
                      >
                        {issue.type ?? "UNKNOWN"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {getFileNameFromComponent(issue.component)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {issue.rule ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-[440px]">
                      <p className="truncate" title={issue.message ?? ""}>
                        {issue.message ?? "-"}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {issue.line ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2">
              <span className="text-xs text-slate-500">
                {filteredAndSortedIssues.length} issues · page {issuePage} of {totalIssuePages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={issuePage === 1}
                  onClick={() => setIssuePage((p: any) => Math.max(1, p - 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
                >
                  ‹
                </button>
                {Array.from({ length: totalIssuePages }, (_, i) => i + 1)
                  .slice(Math.max(0, issuePage - 3), issuePage + 2)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIssuePage(p)}
                      className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                        p === issuePage
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  type="button"
                  disabled={issuePage === totalIssuePages}
                  onClick={() => setIssuePage((p: any) => Math.min(totalIssuePages, p + 1))}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
