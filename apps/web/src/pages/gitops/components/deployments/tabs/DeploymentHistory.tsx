import { useState, useMemo } from "react";
import {
  GitBranch,
  ExternalLink,
  Calendar,
  Clock,
  Loader2,
  Rocket,
} from "lucide-react";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../../../../components/ui/avatar.js";
import { Button } from "../../../../../components/ui/button.js";
import { Card, CardContent } from "../../../../../components/ui/card.js";
import { TableControls, PaginationControls } from "../../TableControls.js";
import type { DeploymentSortCol } from "../types.js";
import type { GitHubDeployment } from "../../types.js";

const PAGE_SIZE = 10;

export default function DeploymentHistoryTab({
  sortCol,
  sortDir,
  filteredRecent,
  envFilter,
  rowsPerPage,
  setEnvFilter,
  setRowsPerPage,
  search,
  setSearch,
  deployments,
  isEnvLoading,
  filteredDeployments,
  uniqueEnvironments,
}: {
  filteredRecent: GitHubDeployment[];
  envFilter: string;
  sortCol: DeploymentSortCol;
  sortDir: "asc" | "desc";
  search: string;
  setSearch: (s: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  deployments: GitHubDeployment[];
  isEnvLoading: boolean;
  filteredDeployments: GitHubDeployment[];
  uniqueEnvironments: string[];
  setEnvFilter: (env: string) => void;
}) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...filteredRecent].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortCol) {
        case "createdAt":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "environment":
          aVal = a.environment ?? "";
          bVal = b.environment ?? "";
          break;
        case "ref":
          aVal = a.ref ?? "";
          bVal = b.ref ?? "";
          break;
        case "sha":
          aVal = a.sha ?? "";
          bVal = b.sha ?? "";
          break;
        case "creator":
          aVal = a.creator?.login ?? "";
          bVal = b.creator?.login ?? "";
          break;
        default:
          aVal = "";
          bVal = "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRecent, sortCol, sortDir]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  return (
    <section>
      <h3 className="font-semibold text-base flex items-center gap-2 mb-3 text-slate-900">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Deployment History
      </h3>

      <Card className="border-slate-200 bg-white/95 shadow-sm">
        <CardContent className="pt-4">
          <TableControls
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Search by environment, ref, or author..."
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setPage}
            extraFilters={
              <select
                value={envFilter}
                onChange={(e) => {
                  setEnvFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
              >
                <option value="all">All Environments</option>
                {uniqueEnvironments.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            }
          />

          {isEnvLoading ? (
            <div className="flex items-center gap-2 justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading deployments…
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-200">
              <Rocket className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                {deployments.length === 0
                  ? "No deployments found. Connect Vercel or Render, or trigger one above."
                  : "No results match your filters."}
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">
                      Environment
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">
                      Ref / SHA
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">
                      Deployed By
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((dep) => (
                    <tr
                      key={dep.id}
                      className="border-t border-slate-100 align-top hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {dep.environment}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs text-slate-700">
                              {dep.ref}
                            </code>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {dep.sha.slice(0, 7)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {dep.creator ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 ring-1 ring-slate-200">
                              <AvatarImage src={dep.creator.avatar_url} />
                              <AvatarFallback className="text-[9px]">
                                {dep.creator.login[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {dep.creator.login}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(dep.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 hover:bg-slate-100"
                          asChild
                        >
                          <a
                            href={dep.url
                              .replace("api.github.com/repos", "github.com")
                              .replace("/deployments/", "/deployments#")}
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
          )}

          <PaginationControls
            rowsPerPage={rowsPerPage}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredDeployments.length}
          />
        </CardContent>
      </Card>
    </section>
  );
}
