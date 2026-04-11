import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type DateRange = "7d" | "14d" | "30d" | "90d";

type DashboardContextValue = {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  return (
    <DashboardContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return ctx;
}
