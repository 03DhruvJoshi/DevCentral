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
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card.js";
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
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 border rounded-lg bg-white p-6">
      {/* Stat chips */}
      <div className="flex flex-wrap gap-2  justify-between">
        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium bg-background">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          {totalUsers} Total
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-3.5 w-3.5" />
          {activeUsers} Active
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium bg-red-50 text-red-800 border-red-200">
          <Ban className="h-3.5 w-3.5" />
          {suspendedUsers} Suspended
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium bg-purple-50 text-purple-800 border-purple-200">
          <Shield className="h-3.5 w-3.5" />
          {adminUsers} Admins
        </span>

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-72">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Search Developer
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, or GitHub..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Role
          </Label>
          <select
            className="w-full border rounded-md p-2 text-sm bg-background"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN only</option>
            <option value="DEV">DEV only</option>
          </select>
        </div>

        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Status
          </Label>
          <select
            className="w-full border rounded-md p-2 text-sm bg-background"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE only</option>
            <option value="SUSPENDED">SUSPENDED only</option>
          </select>
        </div>

        <div className="w-36">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Rows per page
          </Label>
          <select
            className="w-full border rounded-md p-2 text-sm bg-background"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={20}>20 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-800 font-medium">
            Are you sure? This will permanently delete the user and all their
            data.
          </p>
          <div className="flex gap-2 ml-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteUser(confirmDeleteId)}
            >
              Yes, Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Confirm bulk delete dialog */}
      {confirmBulkDelete && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-800 font-medium">
            Permanently delete {selectedIds.size} selected user(s)? This cannot
            be undone.
          </p>
          <div className="flex gap-2 ml-4">
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={
                      paginatedUsers.length > 0 &&
                      paginatedUsers.every((u) => selectedIds.has(u.id))
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GitHub</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      isSelected ? "bg-blue-50" : "",
                      user.status === "SUSPENDED" ? "opacity-60" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        aria-label={`Select ${user.name ?? user.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.name ?? "(no name)"}
                      {isOwnAccount && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.githubUsername ? `@${user.githubUsername}` : "—"}
                    </TableCell>
                    <TableCell>
                      {user.status === "ACTIVE" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="destructive">SUSPENDED</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "ADMIN" ? (
                        <Badge
                          variant="outline"
                          className="border-purple-300 text-purple-700"
                        >
                          ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="secondary">DEV</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isOwnAccount}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                          {user.status === "ACTIVE" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { status: "SUSPENDED" })
                              }
                            >
                              <Ban className="mr-2 h-4 w-4 text-red-500" />
                              Suspend Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { status: "ACTIVE" })
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              Reactivate Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Access Control</DropdownMenuLabel>
                          {user.role === "DEV" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                updateUser(user.id, { role: "ADMIN" })
                              }
                            >
                              <Shield className="mr-2 h-4 w-4 text-purple-500" />
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
                            className="text-red-600 font-bold"
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
                    className="text-center py-12 text-muted-foreground"
                  >
                    No users match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {totalFilteredUsers > 0
            ? `${startIndex + 1}-${Math.min(startIndex + rowsPerPage, totalFilteredUsers)}`
            : "0"}{" "}
          of {totalFilteredUsers} filtered users &nbsp;&middot;&nbsp; Page{" "}
          {safeCurrentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safeCurrentPage >= totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-white shadow-lg px-5 py-3">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.size} user{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <div className="h-4 w-px bg-slate-200" />
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => bulkAction("SUSPEND")}
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            Suspend All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => bulkAction("ACTIVATE")}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Activate All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
