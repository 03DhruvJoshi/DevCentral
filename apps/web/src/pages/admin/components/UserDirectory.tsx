import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Shield,
  Users,
  Download,
  X,
  AlertTriangle,
  UserCheck,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu.js";
import { API_BASE_URL } from "../types.js";

interface User {
  id: string;
  name: string | null;
  email: string;
  githubUsername: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

interface Props {
  onAlert: (type: "success" | "error", message: string) => void;
}

function parseCurrentUser(): CurrentUser | null {
  try {
    const token = localStorage.getItem("devcentral_token");
    if (!token) return null;
    const payloadPart = token.split(".")[1];
    if (typeof payloadPart !== "string" || payloadPart.length === 0) {
      return null;
    }
    const payload = JSON.parse(atob(payloadPart));
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export function UserDirectory({ onAlert }: Readonly<Props>) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [currentUser] = useState<CurrentUser | null>(parseCurrentUser);

  const fetchUsers = useCallback(async (query: string) => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users?search=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  const updateUser = async (
    userId: string,
    payload: Partial<Pick<User, "role" | "status">>,
  ) => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onAlert(
          "error",
          data?.error ?? data?.message ?? "Failed to update user.",
        );
        return;
      }
      onAlert("success", data?.message ?? "User updated successfully.");
      fetchUsers(searchQuery);
    } catch {
      onAlert("error", "Network error while updating user.");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onAlert("error", data?.error ?? "Failed to delete user.");
        return;
      }
      onAlert("success", "User permanently removed.");
      setConfirmDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      fetchUsers(searchQuery);
    } catch {
      onAlert("error", "Network error while deleting user.");
    }
  };

  const bulkAction = async (
    action: "SUSPEND" | "ACTIVATE" | "PROMOTE" | "DEMOTE",
  ) => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/bulk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: Array.from(selectedIds), action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        onAlert("error", data?.error ?? "Bulk operation failed.");
        return;
      }
      onAlert("success", data?.message ?? `Bulk ${action} complete.`);
      setSelectedIds(new Set());
      fetchUsers(searchQuery);
    } catch {
      onAlert("error", "Network error during bulk operation.");
    }
  };

  const bulkDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    const token = localStorage.getItem("devcentral_token");
    for (const id of ids) {
      if (id === currentUser?.id) continue;
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) successCount++;
      } catch {
        // continue
      }
    }
    onAlert("success", `${successCount} user(s) deleted.`);
    setConfirmBulkDelete(false);
    setSelectedIds(new Set());
    fetchUsers(searchQuery);
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onAlert("error", "Failed to export users.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `users-export-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      onAlert("error", "Network error during CSV export.");
    }
  };

  const toggleSelectAll = () => {
    if (paginatedUsers.length === 0) {
      return;
    }

    const areAllPageUsersSelected = paginatedUsers.every((u) =>
      selectedIds.has(u.id),
    );

    if (areAllPageUsersSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedUsers.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedUsers.forEach((u) => next.add(u.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsers = users.filter((u) => u.status === "SUSPENDED").length;
  const adminUsers = users.filter((u) => u.role === "ADMIN").length;

  const filteredUsers = users.filter((u) => {
    const roleMatch = roleFilter ? u.role === roleFilter : true;
    const statusMatch = statusFilter ? u.status === statusFilter : true;
    return roleMatch && statusMatch;
  });

  const totalFilteredUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredUsers / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: <Users className="h-4 w-4 text-blue-500" />,
            label: "Total Users",
            value: totalUsers,
            cls: "bg-blue-50 border-blue-100 text-blue-700",
          },
          {
            icon: <UserCheck className="h-4 w-4 text-emerald-500" />,
            label: "Active",
            value: activeUsers,
            cls: "bg-emerald-50 border-emerald-100 text-emerald-700",
          },
          {
            icon: <Ban className="h-4 w-4 text-rose-500" />,
            label: "Suspended",
            value: suspendedUsers,
            cls: "bg-rose-50 border-rose-100 text-rose-700",
          },
          {
            icon: <Shield className="h-4 w-4 text-purple-500" />,
            label: "Admins",
            value: adminUsers,
            cls: "bg-purple-50 border-purple-100 text-purple-700",
          },
        ].map(({ icon, label, value, cls }) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cls}`}
          >
            {icon}
            <div>
              <p className="text-xl font-bold leading-none">{value}</p>
              <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters + Export ── */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Name, email, or GitHub..."
                  className="pl-9 h-9 bg-slate-50 border-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="w-36">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Role
              </Label>
              <select
                value={roleFilter || "ALL"}
                onChange={(e) => {
                  setRoleFilter(e.target.value === "ALL" ? "" : e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin only</option>
                <option value="DEV">Dev only</option>
              </select>
            </div>

            <div className="w-40">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Status
              </Label>
              <select
                value={statusFilter || "ALL"}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value === "ALL" ? "" : e.target.value,
                  );
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active only</option>
                <option value="SUSPENDED">Suspended only</option>
              </select>
            </div>

            <div className="w-32">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Rows
              </Label>
              <select
                value={String(rowsPerPage)}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 ml-auto border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={exportCSV}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirm delete single user dialog ── */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <DialogTitle className="text-base">Delete User</DialogTitle>
            </div>
            <DialogDescription>
              This will permanently remove the user and all associated data.
              This action{" "}
              <span className="font-semibold text-rose-700">
                cannot be undone
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
            ⚠ Danger Zone — irreversible operation
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (confirmDeleteId) void deleteUser(confirmDeleteId);
              }}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm bulk delete banner ── */}
      {confirmBulkDelete && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <p className="text-sm text-rose-800 font-semibold">
              Permanently delete {selectedIds.size} selected user(s)? This
              cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={bulkDeleteSelected}
            >
              Yes, Delete All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmBulkDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Users table ── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="px-6 py-4 border-b border-slate-100 ">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                User Directory
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {totalFilteredUsers} user{totalFilteredUsers !== 1 ? "s" : ""}{" "}
                {roleFilter || statusFilter ? "matching filters" : "registered"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="w-10 pl-6">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 accent-blue-600"
                    checked={
                      paginatedUsers.length > 0 &&
                      paginatedUsers.every((u) => selectedIds.has(u.id))
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all users"
                  />
                </TableHead>
                {[
                  "Developer",
                  "Email",
                  "GitHub",
                  "Status",
                  "Role",
                  "Joined",
                  "",
                ].map((h) => (
                  <TableHead
                    key={h}
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-3"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const isOwnAccount = currentUser?.id === user.id;
                const isSelected = selectedIds.has(user.id);
                return (
                  <TableRow
                    key={user.id}
                    className={[
                      "border-b border-slate-50 transition-colors",
                      isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/70",
                      user.status === "SUSPENDED" ? "opacity-55" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <TableCell className="pl-6">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 accent-blue-600"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        aria-label={`Select ${user.name ?? user.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm text-slate-900">
                      {user.name ?? (
                        <span className="text-slate-400 italic">No name</span>
                      )}
                      {isOwnAccount && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                          you
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 font-mono">
                      {user.githubUsername ? (
                        `@${user.githubUsername}`
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status === "ACTIVE" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 font-medium text-xs">
                          Suspended
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "ADMIN" ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 font-medium text-xs">
                          Admin
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 font-medium text-xs">
                          Dev
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isOwnAccount}
                            className="h-7 w-7 text-slate-400 hover:text-slate-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-white w-48"
                        >
                          <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
                            Account Status
                          </DropdownMenuLabel>
                          {user.status === "ACTIVE" ? (
                            <DropdownMenuItem
                              className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                              onClick={() =>
                                updateUser(user.id, { status: "SUSPENDED" })
                              }
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                              onClick={() =>
                                updateUser(user.id, { status: "ACTIVE" })
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reactivate Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
                            Access Control
                          </DropdownMenuLabel>
                          {user.role === "DEV" ? (
                            <DropdownMenuItem
                              className="text-purple-600 focus:text-purple-700 focus:bg-purple-50"
                              onClick={() =>
                                updateUser(user.id, { role: "ADMIN" })
                              }
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Promote to Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { role: "DEV" })
                              }
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Demote to Developer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-semibold"
                            onClick={() => setConfirmDeleteId(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Force Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-16 text-slate-400"
                  >
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      No users match your search criteria.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {totalFilteredUsers > 0
            ? `${startIndex + 1}–${Math.min(endIndex, totalFilteredUsers)}`
            : "0"}{" "}
          of{" "}
          <span className="font-medium text-slate-600">
            {totalFilteredUsers}
          </span>{" "}
          users · page {safeCurrentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors text-xs"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, safeCurrentPage - 3), safeCurrentPage + 2)
            .map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${
                  p === safeCurrentPage
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
            disabled={safeCurrentPage >= totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Floating bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 px-5 py-3">
          <span className="text-sm font-semibold text-slate-800 mr-1">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5"
            onClick={() => bulkAction("SUSPEND")}
          >
            <Ban className="h-3.5 w-3.5" />
            Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
            onClick={() => bulkAction("ACTIVATE")}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Activate
          </Button>
          <Button
            size="sm"
            className="h-8 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-slate-400 hover:text-slate-600 gap-1"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
