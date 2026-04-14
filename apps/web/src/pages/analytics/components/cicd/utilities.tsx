import type { CSSProperties } from "react";

// Helper to convert minutes into human-readable hours/minutes
const formatDuration = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return "N/A";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const conclusionColor = (value: string) => {
  if (value === "success") return "#10b981";
  if (value === "failure") return "#ef4444";
  if (value === "timed_out") return "#f97316";
  if (value === "cancelled") return "#64748b";
  return "#94a3b8";
};

const getConclusionBadgeClass = (value: string) => {
  if (value === "success") return "bg-green-50 text-green-700 border-green-200";
  if (value === "failure") return "bg-red-50 text-red-700 border-red-200";
  if (value === "timed_out")
    return "bg-orange-50 text-orange-700 border-orange-200";
  if (value === "cancelled")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  fontSize: "12px",
  padding: "10px 14px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
  color: "#1e293b",
};

export {
  formatDuration,
  formatDate,
  formatDateTime,
  conclusionColor,
  getConclusionBadgeClass,
  TOOLTIP_STYLE,
};
