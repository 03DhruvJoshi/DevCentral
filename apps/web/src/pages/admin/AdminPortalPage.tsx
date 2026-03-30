import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Loader2,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  Shield,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu.js";
import UserProfile from "../../components/layout/UserProfile.js";
import { API_BASE_URL } from "./types.js";

export function AdminPortalPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionAlert, setActionAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users?search=${searchQuery}`, {
          headers,
        }),
        fetch(`${API_BASE_URL}/api/admin/analytics`, { headers }),
      ]);

      if (usersRes.ok && analyticsRes.ok) {
        const usersData = await usersRes.json();
        const analyticsData = await analyticsRes.json();
        setUsers(usersData.users);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (!actionAlert) return;

    const timeoutId = setTimeout(() => {
      setActionAlert(null);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [actionAlert]);

  // Admin Actions
  const updateUser = async (userId: string, payload: any) => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setActionAlert({
          type: "error",
          message:
            result?.error ??
            result?.message ??
            "Failed to update user. Please try again.",
        });
        return;
      }

      setActionAlert({
        type: "success",
        message: result?.message ?? "User successfully updated.",
      });
      fetchData(); // Refresh table
    } catch (error) {
      console.error(error);
      setActionAlert({
        type: "error",
        message: "Network error while updating user.",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (
      !globalThis.confirm(
        "Are you sure? This will permanently delete the user and all their data.",
      )
    )
      return;
    const token = localStorage.getItem("devcentral_token");
    await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData(); // Refresh table
  };

  if (isLoading && !analytics)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-700 flex items-center gap-2 mt-5">
            <ShieldAlert className="h-8 w-8" /> Platform Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise control plane and system diagnostics.
          </p>
        </div>
        <div className="justify-content-right">
          <UserProfile />
        </div>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="directory">
            <Users className="w-4 h-4 mr-2" /> User Directory
          </TabsTrigger>
          <TabsTrigger value="health">
            <Activity className="w-4 h-4 mr-2" /> System Health
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: USER MANAGEMENT */}
        <TabsContent value="directory" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or GitHub..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {users.length} users
            </p>
          </div>

          {actionAlert && (
            <div
              role="alert"
              className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
                actionAlert.type === "success"
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-red-300 bg-red-50 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionAlert.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                <span>{actionAlert.message}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setActionAlert(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>GitHub</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className={
                        user.status === "SUSPENDED"
                          ? "bg-muted/50 opacity-70"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>@{user.githubUsername}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "ACTIVE" ? "default" : "ghost"
                          }
                          className="bg-green-300"
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "ADMIN" ? "outline" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuLabel>
                              Security Actions
                            </DropdownMenuLabel>

                            {user.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, { status: "SUSPENDED" })
                                }
                              >
                                <Ban className="mr-2 h-4 w-4 text-red-500" />{" "}
                                Suspend Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, { status: "ACTIVE" })
                                }
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />{" "}
                                Reactivate Account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>
                              Access Control
                            </DropdownMenuLabel>

                            {user.role === "DEV" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, { role: "ADMIN" })
                                }
                              >
                                <Shield className="mr-2 h-4 w-4 text-purple-500" />{" "}
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, { role: "DEV" })
                                }
                              >
                                <Users className="mr-2 h-4 w-4" /> Demote to
                                Developer
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 font-bold"
                              onClick={() => deleteUser(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Force Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No users match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SYSTEM HEALTH & ANALYTICS */}
        <TabsContent value="health" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Platform Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics?.metrics.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.metrics.activeUsers} currently active
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Scaffolder Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics?.metrics.totalTemplates}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available in marketplace
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-green-500 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  API Gateway Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-green-600/80 mt-1">
                  All microservices responding
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Onboarding</CardTitle>
              <CardDescription>
                The latest developers to join the DevCentral ecosystem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.recentSignups ?? []).map((user: any) => (
                  <div
                    key={`${user?.id ?? user?.email ?? user?.name ?? "user"}-${user?.createdAt ?? "date"}`}
                    className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {user?.name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {user?.name ?? "Unknown user"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined{" "}
                        {new Date(
                          user?.createdAt ?? Date.now(),
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(analytics?.recentSignups?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No recent signups yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
