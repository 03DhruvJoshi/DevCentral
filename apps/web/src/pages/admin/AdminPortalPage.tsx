import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  ScrollText,
  Settings2,
  Radio,
  Lock,
  CheckCircle,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";

import { Button } from "../../components/ui/button.js";

import UserProfile from "../../components/layout/UserProfile.js";

import { UserDirectory } from "./components/UserDirectory.js";

import { AuditLogs } from "./components/AuditLogs.js";
import { FeatureFlags } from "./components/FeatureFlags.js";
import { BroadcastSystem } from "./components/BroadcastSystem.js";
import SecurityTab from "./components/SecurityMetrics.js";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState("directory");
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-700 flex items-center gap-2 mt-5">
            <ShieldAlert className="h-8 w-8" /> Platform Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise control plane and system diagnostics.
          </p>
        </div>
        <div>
          <UserProfile />
        </div>
      </div>

      {/* Global action alert */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security Center
          </TabsTrigger>
          <TabsTrigger value="directory">
            <Users className="w-4 h-4 mr-2" />
            User Directory
          </TabsTrigger>

          <TabsTrigger value="logs">
            <ScrollText className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="features">
            <Settings2 className="w-4 h-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Radio className="w-4 h-4 mr-2" />
            Communications
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
  );
}
