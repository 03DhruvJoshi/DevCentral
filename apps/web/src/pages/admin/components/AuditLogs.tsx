import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  ScrollText,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { API_BASE_URL } from "../types.js";

interface AuditLog {
  id: string;
  action: string;
  actorEmail: string;
  targetId: string | null;
  details: unknown;
  role: string;
  createdAt: string;
}

interface LogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_BADGE: Record<string, string> = {
  CONFIG_UPDATED: "bg-blue-100 text-blue-700 border-blue-200",
  USER_UPDATED: "bg-purple-100 text-purple-700 border-purple-200",
  BULK_USER_UPDATE: "bg-purple-100 text-purple-700 border-purple-200",
  TEMPLATE_DEPLOYED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TEMPLATE_CREATED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  GITOPS_ACTION: "bg-orange-100 text-orange-700 border-orange-200",
  USER_REGISTERED: "bg-teal-100 text-teal-700 border-teal-200",
  DASHBOARD_UPDATED: "bg-slate-100 text-slate-600 border-slate-200",
};

function actionClass(action: string): string {
  return ACTION_BADGE[action] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CONFIG_UPDATED", label: "Config Updated" },
  { value: "USER_UPDATED", label: "User Updated" },
  { value: "TEMPLATE_DEPLOYED", label: "Template Deployed" },
  { value: "GITOPS_ACTION", label: "GitOps Action" },
  { value: "DASHBOARD_UPDATED", label: "Dashboard Updated" },
  { value: "BULK_USER_UPDATE", label: "Bulk User Update" },
  { value: "OTHER", label: "Other" },
];

function parseDetailsRole(details: unknown): string | null {
  if (!details) return null;
  try {
    const parsed = typeof details === "string" ? JSON.parse(details) : details;
    if (parsed && typeof parsed === "object" && "role" in parsed) {
      return String((parsed as Record<string, unknown>).role);
    }
  } catch {
    // not parseable
  }
  return null;
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  if (role === "ADMIN") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-xs font-medium">
        Admin
      </Badge>
    );
  }
  if (role === "DEV") {
    return (
      <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 text-xs font-medium">
        Dev
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {role}
    </Badge>
  );
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logMeta, setLogMeta] = useState<LogMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [logUserFilter, setLogUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(
    async (
      page = 1,
      limit = logMeta.limit,
      user = logUserFilter,
      action = actionFilter,
    ) => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("devcentral_token");
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(user ? { user } : {}),
          ...(action ? { action } : {}),
        });
        const res = await fetch(
          `${API_BASE_URL}/api/admin/audit-logs?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs ?? []);
          setLogMeta(
            data.pagination ?? {
              total: 0,
              page: 1,
              limit,
              totalPages: 1,
            },
          );
        }
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logMeta.limit, logUserFilter, actionFilter],
  );

  // Initial load
  useEffect(() => {
    fetchLogs(1, 20, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced email search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogUserFilter(searchInput);
      fetchLogs(1, logMeta.limit, searchInput, actionFilter);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Action filter change
  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    fetchLogs(1, logMeta.limit, logUserFilter, value);
  };

  // Rows per page change
  const handleLimitChange = (value: number) => {
    fetchLogs(1, value, logUserFilter, actionFilter);
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `audit-logs-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
    }
  };

  // Client-side role filter
  const filteredLogs =
    roleFilter === ""
      ? logs
      : logs.filter((log) => {
          const role = parseDetailsRole(log.details) ?? log.role;
          if (roleFilter === "ADMIN") return role === "ADMIN";
          if (roleFilter === "DEV") return role === "DEV";
          return true;
        });

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="px-6 py-4 border-b border-slate-100 ">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                System Audit Trail
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Immutable record of platform activity · {logMeta.total} total
                entries
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            onClick={exportCSV}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Actor Email
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filter by email..."
                className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="w-44">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Action Type
            </Label>
            <select
              value={actionFilter || "ALL"}
              onChange={(e) =>
                handleActionFilterChange(
                  e.target.value === "ALL" ? "" : e.target.value,
                )
              }
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              {ACTION_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || "ALL"} value={opt.value || "ALL"}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Role
            </Label>
            <select
              value={roleFilter || "ALL"}
              onChange={(e) =>
                setRoleFilter(e.target.value === "ALL" ? "" : e.target.value)
              }
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin only</option>
              <option value="DEV">Dev only</option>
            </select>
          </div>

          <div className="w-28">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Rows
            </Label>
            <select
              value={String(logMeta.limit)}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="20">20 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-slate-100">
              {[
                "Timestamp",
                "Actor",
                "Role",
                "Action",
                "Target",
                "Details",
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 first:pl-6"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                >
                  <TableCell className="pl-6 text-xs text-slate-400 whitespace-nowrap font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-slate-700 font-medium">
                    {log.actorEmail}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={log.role} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${actionClass(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono max-w-[140px] truncate">
                    {log.targetId ?? <span className="text-slate-300">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">
                    {typeof log.details === "string" ? (
                      log.details
                    ) : log.details ? (
                      JSON.stringify(log.details)
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-16 text-slate-400"
                >
                  <ScrollText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No audit logs match your filters.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">
            {logMeta.total > 0
              ? `${(logMeta.page - 1) * logMeta.limit + 1}–${Math.min(logMeta.page * logMeta.limit, logMeta.total)}`
              : "0"}{" "}
            of{" "}
            <span className="font-medium text-slate-600">{logMeta.total}</span>{" "}
            entries · page {logMeta.page} of {logMeta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              disabled={logMeta.page <= 1}
              onClick={() =>
                fetchLogs(
                  logMeta.page - 1,
                  logMeta.limit,
                  logUserFilter,
                  actionFilter,
                )
              }
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: logMeta.totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, logMeta.page - 3), logMeta.page + 2)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    fetchLogs(p, logMeta.limit, logUserFilter, actionFilter)
                  }
                  className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                    p === logMeta.page
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              disabled={logMeta.page >= logMeta.totalPages}
              onClick={() =>
                fetchLogs(
                  logMeta.page + 1,
                  logMeta.limit,
                  logUserFilter,
                  actionFilter,
                )
              }
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
