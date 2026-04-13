// apps/web/src/components/layout/Header.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Layers,
  WandSparkles,
  LayoutDashboard,
  GitBranch,
  AreaChart,
} from "lucide-react";
import { Button } from "../ui/button.js";

import UserProfile from "./UserProfile.js";
import { API_BASE_URL } from "../../pages/admin/types.js";

export function Header() {
  const location = useLocation();
  const [features, setFeatures] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchFeatures = async () => {
      const token = localStorage.getItem("devcentral_token");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/platform/features`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFeatures(await res.json());
    };
    fetchFeatures();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-4 lg:px-8">
        {/* Branding */}
        <Link to="/dashboard" className="mr-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            DevCentral
          </span>
        </Link>

        {/* Navigation Menu */}
        <nav className="flex flex-1 items-center gap-1">
          {features.DASHBOARD_ENABLED !== "false" && (
            <Link to="/dashboard">
              <Button
                variant="default"
                className={`flex items-center gap-2 px-3 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${location.pathname === "/dashboard" ? "text-slate-900 border-b-2 border-slate-900 bg-slate-100" : ""}`}
                size="sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}
          {features.SCAFFOLDER_ENABLED !== "false" && (
            <Link to="/scaffold">
              <Button
                variant="default"
                className={`flex items-center gap-2 px-3 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${location.pathname === "/scaffold" ? "text-slate-900 border-b-2 border-slate-900 bg-slate-100" : ""}`}
                size="sm"
              >
                <WandSparkles className="h-4 w-4" />
                Scaffolder
              </Button>
            </Link>
          )}

          {features.GITOPS_ENABLED !== "false" && (
            <Link to="/gitops">
              <Button
                variant="default"
                className={`flex items-center gap-2 px-3 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${location.pathname === "/gitops" ? "text-slate-900 border-b-2 border-slate-900 bg-slate-100" : ""}`}
                size="sm"
              >
                <GitBranch className="h-4 w-4" />
                GitOps
              </Button>
            </Link>
          )}
          {features.ANALYTICS_ENABLED !== "false" && (
            <Link to="/analytics">
              <Button
                variant="default"
                className={`flex items-center gap-2 px-3 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${location.pathname === "/analytics" ? "text-slate-900 border-b-2 border-slate-900 bg-slate-100" : ""}`}
                size="sm"
              >
                <AreaChart className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="ml-3">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
