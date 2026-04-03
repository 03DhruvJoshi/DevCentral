import { useState, useEffect } from "react";
import { Loader2, Wrench, AlertTriangle, Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "../../../components/ui/dialog.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { Switch } from "../../../components/ui/switch.js";
import { API_BASE_URL } from "../types.js";

interface PlatformConfig {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

function formatKeyName(key: string): string {
  return key
    .replaceAll("_", " ")
    .toLowerCase()
    .replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const MAINTENANCE_BROADCAST_MESSAGE =
  "Platform maintenance is currently in progress. Some features may be temporarily unavailable.";

export function FeatureFlags() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [keyError, setKeyError] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PlatformConfig[] = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error("Failed to load configs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const toggleConfig = async (key: string, currentValue: string) => {
    if (pendingToggles.has(key)) return;
    const newValue = currentValue === "true" ? "false" : "true";
    setPendingToggles((prev) => new Set(prev).add(key));
    try {
      const token = localStorage.getItem("devcentral_token");

      if (key === "MAINTENANCE_MODE") {
        const [maintenanceRes, messageRes, severityRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/config/MAINTENANCE_MODE`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ value: newValue }),
          }),
          fetch(`${API_BASE_URL}/api/admin/config/BROADCAST_MESSAGE`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              value: newValue === "true" ? MAINTENANCE_BROADCAST_MESSAGE : "",
            }),
          }),
          fetch(`${API_BASE_URL}/api/admin/config/BROADCAST_SEVERITY`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              value: newValue === "true" ? "WARNING" : "INFO",
            }),
          }),
        ]);

        if (!maintenanceRes.ok || !messageRes.ok || !severityRes.ok) {
          throw new Error("Failed to update maintenance broadcast settings");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/admin/config/${key}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value: newValue }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update config for ${key}`);
        }
      }

      await fetchConfigs();
    } catch (err) {
      console.error("Toggle config failed", err);
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const deleteConfig = async (key: string) => {
    if (pendingToggles.has(key)) return;

    setPendingToggles((prev) => new Set(prev).add(key));
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/config/${key}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to delete config for ${key}`);
      }
      await fetchConfigs();
    } catch (err) {
      console.error("Delete config failed", err);
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const addCustomFlag = async () => {
    setKeyError("");
    const trimmedKey = newKey.trim().toUpperCase();

    if (!trimmedKey) {
      setKeyError("Key is required.");
      return;
    }
    if (!KEY_PATTERN.test(trimmedKey)) {
      setKeyError(
        "Key must be uppercase letters, digits, and underscores only.",
      );
      return;
    }
    if (configs.some((c) => c.key === trimmedKey)) {
      setKeyError("A flag with this key already exists.");
      return;
    }

    setIsSavingNew(true);
    try {
      const token = localStorage.getItem("devcentral_token");
      await fetch(`${API_BASE_URL}/api/admin/config/${trimmedKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          value: "false",
          description: newDescription.trim() || "Custom feature flag",
        }),
      });
      setNewKey("");
      setNewDescription("");
      await fetchConfigs();
    } catch (err) {
      console.error("Add flag failed", err);
    } finally {
      setIsSavingNew(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  const maintenanceConfig = configs.find((c) => c.key === "MAINTENANCE_MODE");
  const isMaintenanceActive = maintenanceConfig?.value === "true";

  const otherConfigs = configs.filter(
    (c) =>
      c.key !== "BROADCAST_MESSAGE" &&
      c.key !== "MAINTENANCE_MODE" &&
      c.key !== "BROADCAST_SEVERITY",
  );

  return (
    <div className="space-y-6 mb-12">
      {/* Maintenance Mode card */}
      {maintenanceConfig && (
        <Card
          className={`border-2 ${isMaintenanceActive ? "border-red-400" : "border-slate-200"}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              When enabled, all users will see a maintenance notice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMaintenanceActive && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  Platform is currently in maintenance mode
                </span>
              </div>
            )}
            <Button
              className={`w-full text-sm font-semibold ${
                isMaintenanceActive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
              disabled={pendingToggles.has("MAINTENANCE_MODE")}
              onClick={() =>
                toggleConfig("MAINTENANCE_MODE", maintenanceConfig.value)
              }
            >
              {pendingToggles.has("MAINTENANCE_MODE") ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {isMaintenanceActive
                ? "ACTIVE — Click to Disable"
                : "INACTIVE — Click to Enable"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feature flags table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Feature Flags</CardTitle>
          <CardDescription>
            Instantly toggle platform capabilities without redeploying code.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {otherConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feature flags configured.
            </p>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Toggle</TableHead>
                  <TableHead className="text-right">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherConfigs.map((config) => {
                  const isEnabled = config.value === "true";
                  const isPending = pendingToggles.has(config.key);
                  return (
                    <TableRow key={config.key}>
                      <TableCell className="font-mono text-sm font-medium">
                        {config.key}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {config.description ?? formatKeyName(config.key)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEnabled ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <Loader2 className="animate-spin h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Switch
                            checked={isEnabled}
                            disabled={isPending}
                            onCheckedChange={() =>
                              toggleConfig(config.key, config.value)
                            }
                            className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-700 data-[state=checked]:hover:bg-green-700"
                            aria-label={`Toggle ${config.key}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-auto w-auto" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm bg-white">
                            <DialogHeader>
                              <DialogTitle>Delete Feature Flag</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this feature
                                flag? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => {}}>
                                  Cancel
                                </Button>
                              </DialogClose>
                              <Button
                                type="submit"
                                className="bg-black hover:bg-red-700 border-white-600 hover:border-red-700 text-white"
                                onClick={async () => {
                                  await deleteConfig(config.key);
                                }}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add custom flag section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Custom Flag</CardTitle>
          <CardDescription>
            Create a new feature flag. New flags are created in a disabled
            state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-flag-key">Flag Key</Label>
              <Input
                id="new-flag-key"
                placeholder="MY_CUSTOM_FLAG"
                value={newKey}
                onChange={(e) => {
                  setNewKey(e.target.value.toUpperCase());
                  setKeyError("");
                }}
              />
              {keyError && <p className="text-xs text-red-600">{keyError}</p>}
              <p className="text-xs text-muted-foreground">
                Uppercase letters, digits, and underscores only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-flag-desc">Description</Label>
              <Input
                id="new-flag-desc"
                placeholder="Brief description of this flag..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={addCustomFlag}
            disabled={isSavingNew || !newKey.trim()}
          >
            {isSavingNew ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Flag
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
