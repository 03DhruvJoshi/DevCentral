import { Badge } from "../../../../components/ui/badge.js";
import {
  CheckCircle2,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import type { NormalisedDeployment } from "./types.js";
import type { ReactNode } from "react";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(sec: number | null): string {
  if (sec === null || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function formatAbsDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  fontSize: "12px",
  padding: "10px 14px",
  boxShadow:
    "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
  color: "#1e293b",
};

// ─── Small pieces ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NormalisedDeployment["status"] }) {
  const styles: Record<typeof status, string> = {
    success: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    building: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const icons: Record<typeof status, ReactNode> = {
    success: <CheckCircle2 className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    building: <RefreshCw className="h-3 w-3 animate-spin" />,
    cancelled: <Minus className="h-3 w-3" />,
  };
  return (
    <Badge
      variant="outline"
      className={`${styles[status]} flex items-center gap-1 capitalize text-xs`}
    >
      {icons[status]}
      {status}
    </Badge>
  );
}

function VercelLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 116 100"
      fill="currentColor"
      aria-hidden
    >
      <path d="M57.5 0L115 100H0L57.5 0z" />
    </svg>
  );
}

function RenderLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#46E3B7" aria-hidden>
      <path d="M4.51 0C2.02 0 0 2.02 0 4.51v14.98C0 21.98 2.02 24 4.51 24h14.98C21.98 24 24 21.98 24 19.49V4.51C24 2.02 21.98 0 19.49 0H4.51zm7.49 6.59l5.41 9.41H6.59L12 6.59z" />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: "vercel" | "render" }) {
  return provider === "vercel" ? <VercelLogo /> : <RenderLogo />;
}

// ─── Trend Arrow ────────────────────────────────────────────────────────────────

function TrendIndicator({ pct }: { pct: number | null }) {
  if (pct === null)
    return <span className="text-xs text-slate-400">—</span>;
  const up = pct >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

export {
  formatRelativeTime,
  formatDuration,
  formatAbsDate,
  StatusBadge,
  ProviderIcon,
  TrendIndicator,
  TOOLTIP_STYLE,
  RenderLogo,
  VercelLogo,
};
