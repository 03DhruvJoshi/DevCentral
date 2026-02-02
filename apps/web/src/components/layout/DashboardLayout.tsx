// apps/web/src/components/layout/DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
      <Header />
      {/* The Outlet renders whatever page is currently selected in the URL */}
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
