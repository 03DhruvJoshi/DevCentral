import { useState, useEffect } from "react";
import {
  Loader2,
  Wrench,
  AlertTriangle,
  Plus,
  Trash2,
  Settings2,
  ToggleLeft,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card.js";
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
import { API_BASE_URL } from "../types.js";

interface PlatformConfig {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

function OnOffToggle({
  checked,
  disabled,
  onToggle,
  onClassName,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onClassName: string;
  ariaLabel: string;
}) {
  const isOn = checked;
  const isOff = checked === false;

  return (
    <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
      <button
        type="button"
        disabled={disabled || isOff}
        onClick={onToggle}
        aria-label={`${ariaLabel} on`}
        className={`h-6 px-2.5 rounded text-[11px] font-semibold transition-colors ${
          isOff
            ? "bg-slate-200 text-slate-700"
            : "text-slate-400 hover:text-slate-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        OFF
      </button>
      <button
        type="button"
        disabled={disabled || isOn}
        aria-label={`${ariaLabel} off`}
        onClick={onToggle}
        className={`h-6 px-2.5 rounded text-[11px] font-semibold transition-colors ${
          isOn
            ? `${onClassName} text-white`
            : "text-slate-400 hover:text-slate-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        ON
      </button>
    </div>
  );
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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
        if (!res.ok) throw new Error(`Failed to update config for ${key}`);
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to delete config for ${key}`);
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
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
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
      {/* ── Maintenance Mode — Danger Zone ── */}
      {maintenanceConfig && (
        <Card
          className={`border-2 bg-white shadow-sm ${isMaintenanceActive ? "border-rose-300 bg-rose-50/30" : "border-slate-200"}`}
        >
          <CardHeader  >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMaintenanceActive ? "bg-rose-100" : "bg-slate-100"}`}
                >
                  <Wrench
                    className={`h-4 w-4 ${isMaintenanceActive ? "text-rose-600" : "text-slate-500"}`}
                  />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    Maintenance Mode
                    {isMaintenanceActive && (
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 text-xs font-semibold animate-pulse">
                        ACTIVE
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    When enabled, all users see a platform-wide maintenance
                    notice and a broadcast warning banner.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {pendingToggles.has("MAINTENANCE_MODE") ? (
                  <Loader2 className="animate-spin h-4 w-4 text-slate-400" />
                ) : null}
                <OnOffToggle
                  checked={isMaintenanceActive}
                  disabled={pendingToggles.has("MAINTENANCE_MODE")}
                  onToggle={() =>
                    toggleConfig("MAINTENANCE_MODE", maintenanceConfig.value)
                  }
                  onClassName="bg-rose-600"
                  ariaLabel="Toggle maintenance mode"
                />
              </div>
            </div>
          </CardHeader>

          {isMaintenanceActive && (
            <CardContent className="pt-0">
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-semibold">
                    Platform is in maintenance mode
                  </p>
                  <p className="text-xs text-rose-600 mt-0.5">
                    All users are seeing a maintenance warning. Disable this
                    when the platform is operational.
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Platform Feature Flags ── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <ToggleLeft className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Platform Feature Flags
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Toggle platform capabilities without redeploying code.{" "}
                {otherConfigs.length} flag{otherConfigs.length === 1 ? "" : "s"}{" "}
                configured.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 bg-white">
          {otherConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Settings2 className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">No feature flags configured.</p>
              <p className="text-xs mt-1 text-slate-300">
                Use the form below to add your first flag.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {otherConfigs.map((config) => {
                const isEnabled = config.value === "true";
                const isPending = pendingToggles.has(config.key);
                return (
                  <div
                    key={config.key}
                    className={`flex items-center justify-between gap-6 px-6 py-4 transition-colors ${isEnabled ? "hover:bg-slate-50/50" : "hover:bg-slate-50/50 opacity-80"}`}
                  >
                    {/* Left: Flag info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <code className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {config.key}
                        </code>
                        {isEnabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        <span>
                          {config.description ?? formatKeyName(config.key)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatRelativeTime(config.updatedAt)}
                      </p>
                    </div>

                    {/* Right: Toggle + Delete */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isPending && (
                        <Loader2 className="animate-spin h-3.5 w-3.5 text-slate-400" />
                      )}
                      <OnOffToggle
                        checked={isEnabled}
                        disabled={isPending}
                        onToggle={() => toggleConfig(config.key, config.value)}
                        onClassName="bg-blue-600"
                        ariaLabel={`Toggle ${config.key}`}
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-900 hover:text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm bg-white">
                          <DialogHeader>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                              </div>
                              <DialogTitle className="text-base">
                                Delete Feature Flag
                              </DialogTitle>
                            </div>
                            <DialogDescription>
                              <span>Delete flag </span>
                              <code className="font-mono font-semibold text-slate-800 bg-slate-100 px-1 rounded">
                                {config.key}
                              </code>
                              <span>. This action cannot be undone.</span>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                            ⚠ This flag will be permanently removed
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={async () => {
                                await deleteConfig(config.key);
                              }}
                            >
                              Delete Flag
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Custom Flag ── */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Add Custom Flag
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                New flags are created in a{" "}
                <span className="font-medium">disabled</span> state by default.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="new-flag-key"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Flag Key
              </Label>
              <Input
                id="new-flag-key"
                placeholder="MY_CUSTOM_FLAG"
                value={newKey}
                onChange={(e) => {
                  setNewKey(e.target.value.toUpperCase());
                  setKeyError("");
                }}
                className="font-mono bg-slate-50 border-slate-200 focus-visible:ring-blue-500/25 focus-visible:border-blue-500"
              />
              {keyError && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {keyError}
                </p>
              )}
              <p className="text-xs text-slate-400">
                Uppercase letters, digits, and underscores only.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="new-flag-desc"
                className="text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Description
              </Label>
              <Input
                id="new-flag-desc"
                placeholder="Brief description of this flag..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/25 focus-visible:border-blue-500"
              />
            </div>
          </div>
          <Button
            className="mt-5 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={addCustomFlag}
            disabled={isSavingNew || !newKey.trim()}
          >
            {isSavingNew ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Flag
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
