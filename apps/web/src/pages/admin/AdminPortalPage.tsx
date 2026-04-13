import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  ScrollText,
  Settings2,
  Radio,
  Lock,
  CheckCircle,
  Layers,
  X,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import { Button } from "../../components/ui/button.js";
import { Badge } from "../../components/ui/badge.js";
import UserProfile from "../../components/layout/UserProfile.js";
import { UserDirectory } from "./components/UserDirectory.js";
import { AuditLogs } from "./components/AuditLogs.js";
import { FeatureFlags } from "./components/FeatureFlags.js";
import { BroadcastSystem } from "./components/BroadcastSystem.js";
import SecurityTab from "./components/SecurityMetrics.js";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState("security");
  const [actionAlert, setActionAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleAlert = (type: "success" | "error", message: string) => {
    setActionAlert({ type, message });
  };

  useEffect(() => {
    if (!actionAlert) return;
    const t = setTimeout(() => setActionAlert(null), 4000);
    return () => clearTimeout(t);
  }, [actionAlert]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* ── Top navigation bar ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Logo + breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                DevCentral
              </span>
            </div>

            <span className="text-slate-300 text-lg font-light">/</span>

            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium text-slate-700">
                Admin Console
              </span>
            </div>
          </div>

          {/* Right: User profile */}
          <UserProfile />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* ── Page title ── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Administration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Enterprise control plane — manage users, configuration, and platform
            health.
          </p>
        </div>

        {/* ── Global action alert ── */}
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
                <ShieldAlert className="h-4 w-4 shrink-0" />
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

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-10 bg-slate-100 p-1 rounded-xl w-full grid grid-cols-5">
            <TabsTrigger
              value="security"
              className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="directory"
              className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Feature Flags
            </TabsTrigger>
            <TabsTrigger
              value="broadcast"
              className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Radio className="w-3.5 h-3.5" />
              Broadcast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-6">
            <SecurityTab onOpenTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="directory" className="mt-6">
            <UserDirectory onAlert={handleAlert} />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <FeatureFlags />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <BroadcastSystem />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
