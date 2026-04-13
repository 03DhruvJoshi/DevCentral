// apps/web/src/components/layout/UserProfile.tsx

import { Settings, LogOut, CircleUserRound } from "lucide-react";
import { Button } from "../ui/button.js";
import { clearAuthStorage } from "../../lib/auth.js";
import { Separator } from "../ui/separator.js";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";

function getDisplayName(): string {
  try {
    const raw = localStorage.getItem("devcentral_user");
    if (!raw) return "";
    const user = JSON.parse(raw) as Record<string, unknown>;
    return String(user.name ?? user.email ?? "");
  } catch {
    return "";
  }
}

function UserProfile() {
  const displayName = getDisplayName();

  const handleLogout = () => {
    clearAuthStorage();
    globalThis.location.href = "/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
        >
          <CircleUserRound className="relative h-9 w-9" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-lg"
      >
        {displayName && (
          <>
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-400 mt-0.5">Developer Account</p>
            </div>
            <Separator className="my-1 bg-slate-100" />
          </>
        )}
        <DropdownMenuItem
          className="cursor-pointer rounded-lg transition-colors duration-200 hover:bg-slate-100"
          onClick={() => { globalThis.location.href = "/settings"; }}
        >
          <Settings className="mr-2 h-4 w-4" /> Account Settings
        </DropdownMenuItem>
        <Separator className="my-1 bg-slate-100" />
        <DropdownMenuItem
          className="cursor-pointer rounded-lg text-red-600 transition-colors duration-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserProfile;
