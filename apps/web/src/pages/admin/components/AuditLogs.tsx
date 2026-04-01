import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";
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

const ACTION_COLORS: Record<string, string> = {
  CONFIG_UPDATED: "bg-blue-100 text-blue-800",
  USER_UPDATED: "bg-purple-100 text-purple-800",
  BULK_USER_UPDATE: "bg-purple-100 text-purple-800",
  TEMPLATE_DEPLOYED: "bg-green-100 text-green-800",
  TEMPLATE_CREATED: "bg-green-100 text-green-800",
  GITOPS_ACTION: "bg-orange-100 text-orange-800",
  USER_REGISTERED: "bg-teal-100 text-teal-800",
  DASHBOARD_UPDATED: "bg-slate-100 text-slate-700",
};

function actionClass(action: string): string {
  return ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700";
}

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CONFIG_UPDATED", label: "CONFIG_UPDATED" },
  { value: "USER_UPDATED", label: "USER_UPDATED" },
  { value: "TEMPLATE_DEPLOYED", label: "TEMPLATE_DEPLOYED" },
  { value: "GITOPS_ACTION", label: "GITOPS_ACTION" },
  { value: "DASHBOARD_UPDATED", label: "DASHBOARD_UPDATED" },
  { value: "BULK_USER_UPDATE", label: "BULK_USER_UPDATE" },
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

function roleBadge(role: string | null) {
  if (!role) return null;
  if (role === "ADMIN") {
    return (
      <Badge variant="default" className="text-xs bg-red-100 text-red-800">
        ADMIN
      </Badge>
    );
  }
  if (role === "DEV") {
    return (
      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
        DEV
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>System Audit Trail</CardTitle>
            <CardDescription>
              Immutable record of platform activity. Showing{" "}
              {filteredLogs.length} of {logMeta.total} total entries.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters row */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="w-64">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Filter by Actor Email
            </Label>
            <Input
              placeholder="Search user email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="w-48">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Action Type
            </Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={actionFilter}
              onChange={(e) => handleActionFilterChange(e.target.value)}
            >
              {ACTION_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="w-36">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Role (client-side)
            </Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN only</option>
              <option value="DEV">DEV only</option>
            </select>
          </div>

          <div className="w-32">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Rows per page
            </Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={logMeta.limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
            >
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                <TableHead>Actor Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.actorEmail}
                      </TableCell>
                      <TableCell>{roleBadge(log.role)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-mono ${actionClass(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                        {log.targetId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {typeof log.details === "string"
                          ? log.details
                          : log.details
                            ? JSON.stringify(log.details)
                            : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No audit logs found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {logMeta.total > 0
              ? `${(logMeta.page - 1) * logMeta.limit + 1}–${Math.min(logMeta.page * logMeta.limit, logMeta.total)}`
              : "0"}{" "}
            of {logMeta.total} entries &nbsp;&middot;&nbsp; Page {logMeta.page}{" "}
            of {logMeta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
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
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
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
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
