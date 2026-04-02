// apps/web/src/components/layout/Header.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, LayoutDashboard, GitBranch, BarChart } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center px-4 max-w-7xl mx-auto">
        {/* Branding */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-bold text-xl mr-8"
        >
          <Box className="h-6 w-6 text-primary" />
          <span>DevCentral</span>
        </Link>

        {/* Navigation Menu */}
        <nav className="flex items-center gap-2 flex-1">
          {features.DASHBOARD_ENABLED !== "false" && (
            <Link to="/dashboard">
              <Button
                variant={
                  location.pathname === "/dashboard" ? "secondary" : "ghost"
                }
                className="flex items-center gap-2"
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
                variant={
                  location.pathname === "/scaffold" ? "secondary" : "ghost"
                }
                className="flex items-center gap-2"
                size="sm"
              >
                <Box className="h-4 w-4" />
                Scaffolder
              </Button>
            </Link>
          )}

          {features.GITOPS_ENABLED !== "false" && (
            <Link to="/gitops">
              <Button
                variant={
                  location.pathname === "/gitops" ? "secondary" : "ghost"
                }
                className="flex items-center gap-2"
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
                variant={
                  location.pathname === "/analytics" ? "secondary" : "ghost"
                }
                className="flex items-center gap-2"
                size="sm"
              >
                <BarChart className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="mr-4">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
