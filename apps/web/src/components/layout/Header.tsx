// apps/web/src/components/layout/Header.tsx
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  LayoutDashboard,
  GitBranch,
  // Sparkles,
  Settings,
  BarChart,
  User,
  LogOut,
  CircleUserRound,
} from "lucide-react";
import { Button } from "../ui/button.js";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "GitOps", path: "/gitops", icon: GitBranch },
  { name: "Scaffolder", path: "/scaffold", icon: Box },
  { name: "Dev Analytics", path: "/analytics", icon: BarChart },
  // { name: "AI Assistant", path: "/ai-assistant", icon: Sparkles },
];

export function Header() {
  const location = useLocation();

  // --- 1. Create the Logout Handler ---
  const handleLogout = () => {
    // Remove the authentication tokens from the browser
    localStorage.removeItem("devcentral_token");

    // Redirect the user back to the login page
    globalThis.location.href = "/login";
  };

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
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`flex items-center gap-2 ${isActive ? "font-semibold" : "text-muted-foreground"}`}
                  size="sm"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full border"
            >
              <CircleUserRound className="relative h-9 w-9" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>

            {/* --- 2. Attach the handler to the onClick event --- */}
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
