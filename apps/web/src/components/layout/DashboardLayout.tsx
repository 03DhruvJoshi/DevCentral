// apps/web/src/components/layout/DashboardLayout.tsx

import { Outlet } from "react-router-dom";
import { Header } from "./Header.js";

export function DashboardLayout() {
  return (
    <div className="min-h-screen w-full bg-slate-50 antialiased">
      <Header />
      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 pb-8 pt-6 lg:px-8">
        {/* The Outlet renders whatever page is currently selected in the URL */}
        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
