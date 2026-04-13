import { useState, useEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Radio,
  StopCircle,
  Info,
  Zap,
  CheckCircle,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";
import { Label } from "../../../components/ui/label.js";
import { Textarea } from "../../../components/ui/textarea.js";
import { API_BASE_URL } from "../types.js";

type Severity = "INFO" | "WARNING" | "CRITICAL";

interface PlatformConfig {
  key: string;
  value: string;
}

interface ActionAlert {
  type: "success" | "error";
  message: string;
}

const SEVERITY_STYLES: Record<
  Severity,
  {
    button: string;
    badge: string;
    preview: string;
    icon: React.ReactNode;
    label: string;
    description: string;
  }
> = {
  INFO: {
    button: "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100",
    badge: "bg-blue-600 text-white",
    preview: "bg-blue-600 text-white",
    icon: <Info className="h-4 w-4" />,
    label: "INFO",
    description: "Informational update",
  },
  WARNING: {
    button:
      "border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100",
    badge: "bg-orange-500 text-white",
    preview: "bg-orange-500 text-white",
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "WARNING",
    description: "Action required",
  },
  CRITICAL: {
    button: "border-red-300 text-red-700 bg-red-50 hover:bg-red-100",
    badge: "bg-red-600 text-white",
    preview: "bg-red-600 text-white",
    icon: <Zap className="h-4 w-4" />,
    label: "CRITICAL",
    description: "Urgent issue",
  },
};

async function saveConfig(key: string, value: string, token: string) {
  return fetch(`${API_BASE_URL}/api/admin/config/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
}

export function BroadcastSystem() {
  const [broadcastInput, setBroadcastInput] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>("INFO");
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionAlert, setActionAlert] = useState<ActionAlert | null>(null);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: PlatformConfig[] = await res.json();
        setConfigs(data);
        const msg = data.find((c) => c.key === "BROADCAST_MESSAGE");
        const sev = data.find((c) => c.key === "BROADCAST_SEVERITY");
        if (msg) setBroadcastInput(msg.value);
        if (sev && ["INFO", "WARNING", "CRITICAL"].includes(sev.value)) {
          setSelectedSeverity(sev.value as Severity);
        }
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

  useEffect(() => {
    if (!actionAlert) return;
    const t = setTimeout(() => setActionAlert(null), 4000);
    return () => clearTimeout(t);
  }, [actionAlert]);

  const publishBroadcast = async () => {
    if (!broadcastInput.trim()) {
      setActionAlert({
        type: "error",
        message: "Broadcast message cannot be empty.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("devcentral_token");
      const [msgRes, sevRes] = await Promise.all([
        saveConfig("BROADCAST_MESSAGE", broadcastInput.trim(), token!),
        saveConfig("BROADCAST_SEVERITY", selectedSeverity, token!),
      ]);
      if (msgRes.ok && sevRes.ok) {
        setActionAlert({
          type: "success",
          message: `Broadcast published globally with ${selectedSeverity} severity.`,
        });
        await fetchConfigs();
      } else {
        setActionAlert({
          type: "error",
          message: "Failed to publish broadcast.",
        });
      }
    } catch {
      setActionAlert({
        type: "error",
        message: "Network error while publishing.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stopBroadcast = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("devcentral_token");
      const [msgRes, sevRes] = await Promise.all([
        saveConfig("BROADCAST_MESSAGE", "", token!),
        saveConfig("BROADCAST_SEVERITY", "INFO", token!),
      ]);
      if (msgRes.ok && sevRes.ok) {
        setBroadcastInput("");
        setSelectedSeverity("INFO");
        setActionAlert({
          type: "success",
          message: "Broadcast stopped globally.",
        });
        await fetchConfigs();
      } else {
        setActionAlert({ type: "error", message: "Failed to stop broadcast." });
      }
    } catch {
      setActionAlert({
        type: "error",
        message: "Network error while stopping broadcast.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeBroadcast = configs.find(
    (c) => c.key === "BROADCAST_MESSAGE" && c.value.trim() !== "",
  );
  const activeSeverity =
    (configs.find((c) => c.key === "BROADCAST_SEVERITY")?.value as Severity) ??
    "INFO";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
      </div>
    );
  }

  const severityStyle = SEVERITY_STYLES[selectedSeverity];
  const activeStyle = SEVERITY_STYLES[activeSeverity] ?? SEVERITY_STYLES.INFO;

  return (
    <div className="space-y-6">
      {/* Action alert */}
      {actionAlert && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-sm ${
            actionAlert.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionAlert.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{actionAlert.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-transparent opacity-60 hover:opacity-100"
            onClick={() => setActionAlert(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Current Status card */}
      <Card className={`border-slate-200 shadow-sm overflow-hidden ${activeBroadcast ? "border-orange-300" : ""}`}>
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeBroadcast ? "bg-orange-100" : "bg-slate-100"}`}>
              <Radio className={`h-3.5 w-3.5 ${activeBroadcast ? "text-orange-600" : "text-slate-500"}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Current Broadcast Status</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {activeBroadcast ? "Active platform-wide banner" : "No active broadcast — banner hidden for all users"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4">
          {activeBroadcast ? (
            <div
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${activeStyle.preview}`}
            >
              <span className="shrink-0">{activeStyle.icon}</span>
              <div className="flex-1">
                <span className="font-bold mr-2">{activeSeverity}:</span>
                {activeBroadcast.value}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No active broadcast. The platform banner is hidden for all users.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Compose section */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Radio className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Compose Broadcast</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Push an alert banner to all active developers on the platform.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pt-6 pb-6 space-y-6">
          {/* Severity selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Severity Level</Label>
            <div className="flex gap-2 flex-wrap">
              {(["INFO", "WARNING", "CRITICAL"] as Severity[]).map((sev) => {
                const style = SEVERITY_STYLES[sev];
                const isActive = selectedSeverity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeverity(sev)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                      isActive
                        ? style.badge + " border-transparent"
                        : style.button
                    }`}
                  >
                    {style.icon}
                    {sev}
                    <span className="text-xs font-normal opacity-80">
                      — {style.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-message" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</Label>
            <Textarea
              id="broadcast-message"
              placeholder="e.g., GitHub Actions API is currently experiencing delays. Our team is investigating."
              value={broadcastInput}
              onChange={(e) => setBroadcastInput(e.target.value)}
              rows={3}
              className="bg-slate-50 border-slate-200 text-sm resize-none focus-visible:border-blue-500 focus-visible:ring-blue-500/25 focus-visible:ring-[3px]"
            />
          </div>

          {/* Preview */}
          {broadcastInput.trim() && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</Label>
              <div
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${severityStyle.preview}`}
              >
                <span className="shrink-0">{severityStyle.icon}</span>
                <p>
                  <strong className="font-bold mr-2">PLATFORM ALERT:</strong>
                  {broadcastInput}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={publishBroadcast}
              disabled={isSaving || !broadcastInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
            >
              {isSaving ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Radio className="h-4 w-4 mr-2" />
              )}
              Publish Broadcast
            </Button>

            {activeBroadcast && (
              <Button
                variant="outline"
                onClick={stopBroadcast}
                disabled={isSaving}
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Broadcast
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Broadcasts are stored in Platform Config and polled every 60 seconds by connected clients.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
