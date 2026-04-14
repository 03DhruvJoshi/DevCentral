import type { RiskLevel } from "./types.js";
import type { CSSProperties } from "react";

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  fontSize: "12px",
  padding: "10px 14px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
  color: "#1e293b",
};

const formatHours = (hours: number | null) => {
  if (hours === null || hours === undefined) return "N/A";
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getRiskBadgeClass = (risk: RiskLevel) => {
  if (risk === "high") return "bg-red-50 text-red-700 border-red-200";
  if (risk === "medium")
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
};

const getStateBadgeClass = (state: string) => {
  if (state === "merged")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (state === "open") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export {
  formatHours,
  formatShortDate,
  getRiskBadgeClass,
  getStateBadgeClass,
  TOOLTIP_STYLE,
};
