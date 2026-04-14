import { Bell, Moon, Shield, SlidersHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Switch } from "../../../../components/ui/switch.js";

const PLACEHOLDER_SETTINGS = [
  "Enable Email Notifications for Failed Deployments",
  "Dark Mode",
  "Auto-Refresh Dashboard Every 30 Seconds",
  "Show Compact Card Density",
  "Enable Weekly Delivery Health Digest",
  "Highlight Risky Pull Requests",
  "Auto-Archive Stale Templates",
  "Enable GitOps Deployment Confirmations",
  "Show Developer Activity Heatmap",
  "Enable Security Alert Banners",
];

export function PreferencesSection() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Platform Preferences
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Placeholder controls for upcoming user preference management.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="space-y-3">
            {PLACEHOLDER_SETTINGS.map((setting, index) => (
              <div
                key={setting}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start gap-2.5 pr-4">
                  {index % 3 === 0 && (
                    <Bell className="mt-0.5 h-4 w-4 text-slate-500" />
                  )}
                  {index % 3 === 1 && (
                    <Moon className="mt-0.5 h-4 w-4 text-slate-500" />
                  )}
                  {index % 3 === 2 && (
                    <Shield className="mt-0.5 h-4 w-4 text-slate-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {setting}
                    </p>
                    <p className="text-xs text-slate-500">Coming soon</p>
                  </div>
                </div>
                <Switch
                  checked={false}
                  disabled
                  aria-label={`${setting} placeholder`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
