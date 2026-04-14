import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  ScrollText,
  Settings2,
  Radio,
  Lock,
  CheckCircle,
  Layers,
  LayoutDashboard,
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
    <div className="  bg-slate-50/50">
      {/* ── Top navigation bar ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="  px-6   mx-auto flex h-16 w-full max-w-[1440px] flex items-center justify-between gap-4">
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

          {/* Right: quick navigation + user profile */}
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* ── Page Banner ── */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-30%,rgba(244,63,94,0.07),transparent)]" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 ring-1 ring-rose-500/20 shadow-sm">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Platform Administration
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  Enterprise control plane · manage users, configuration, and
                  platform health
                </p>
              </div>
            </div>
            <Badge className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="font-medium">Admin Console</span>
            </Badge>
          </div>
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
          <TabsList className="mb-2 flex h-full w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm">
            <TabsTrigger
              value="security"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="directory"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <Users className="w-3.5 h-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Feature Flags
            </TabsTrigger>
            <TabsTrigger
              value="broadcast"
              className="flex items-center gap-1.5 rounded-md text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-xs"
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
