import { useState, type ReactNode } from "react";

import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Link,
  Unlink,
} from "lucide-react";

import { Badge } from "../../../../components/ui/badge.js";
import { Button } from "../../../../components/ui/button.js";

import {
  ProviderIcon,
  formatRelativeTime,
  formatDuration,
  StatusBadge,
  formatAbsDate,
} from "./utilities.js";
import type { ProviderStat, NormalisedDeployment } from "./types.js";

import { API_BASE_URL, token } from "../types.js";

function ConnectModal({
  provider,
  onClose,
  onSuccess,
}: {
  provider: "vercel" | "render";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiToken, setApiToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVercel = provider === "vercel";

  async function handleConnect() {
    const trimmed = apiToken.trim();
    if (!trimmed) {
      setError("API token is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/integrations/${provider}/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            apiToken: trimmed,
            ...(isVercel && teamId.trim() ? { teamId: teamId.trim() } : {}),
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Connection failed.");
      else onSuccess();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <ProviderIcon provider={provider} />
            </div>
            <h2 className="font-semibold text-base text-slate-900">
              Connect {isVercel ? "Vercel" : "Render"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          {isVercel
            ? "Enter your Vercel API token to pull real deployment metrics. Create one at vercel.com → Account → Tokens."
            : "Enter your Render API key to pull deployment data. Find it at dashboard.render.com → Account Settings → API Keys."}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">
              API {isVercel ? "Token" : "Key"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => {
                  setApiToken(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                placeholder={isVercel ? "vercel_pat_..." : "rnd_..."}
                autoFocus
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono placeholder:text-slate-400 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {isVercel && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">
                Team slug{" "}
                <span className="font-normal text-slate-400">
                  (optional — needed for team deployments)
                </span>
              </label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="my-org"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-900"
              />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            onClick={handleConnect}
            disabled={submitting || !apiToken.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Validating…
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect {isVercel ? "Vercel" : "Render"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConnectedProviderCard({
  provider,
  stats,
  connectedAt,
  isFiltered,
  onDisconnect,
}: {
  provider: "vercel" | "render";
  stats: ProviderStat | undefined;
  connectedAt: string | null;
  isFiltered: boolean;
  onDisconnect: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  async function handleDisconnect(e: React.MouseEvent) {
    e.stopPropagation();
    setDisconnecting(true);
    try {
      await fetch(`${API_BASE_URL}/api/integrations/${provider}/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDisconnect();
    } catch {
      /* ignore */
    } finally {
      setDisconnecting(false);
    }
  }
  const name = provider === "vercel" ? "Vercel" : "Render";
  const accentColor = provider === "vercel" ? "#374151" : "#46E3B7";
  const sr = stats?.successRate ?? 0;
  const successCls =
    sr >= 95 ? "text-green-600" : sr >= 85 ? "text-yellow-600" : "text-red-600";
  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors ${
        isFiltered
          ? "border-indigo-300 ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
        style={{ backgroundColor: accentColor }}
      />
      <div className="pt-5 pb-4 px-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
              <ProviderIcon provider={provider} />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">{name}</p>
              <Badge className="text-xs mt-0.5 bg-green-50 text-green-700 border border-green-200">
                Connected
              </Badge>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            title="Disconnect"
            className="flex text-sm text-slate-700 hover:text-red-500 transition-colors disabled:opacity-50 p-1 rounded-md hover:bg-red-50 bg-slate-100 shadow-sm border border-slate-200 hover:border-red-200"
          >
            {disconnecting ? (
              <RefreshCw className="h-5 w-5 animate-spin p-1" />
            ) : (
              <Unlink className="h-5 w-5 p-1" />
            )}
            Disconnect
          </button>
        </div>
        {stats ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-2">
            <div>
              <p className="text-xs text-slate-500">Success Rate</p>
              <p className={`text-xl font-bold ${successCls}`}>
                {stats.successRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Deploys</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.totalDeploys}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Duration</p>
              <p className="text-sm font-semibold text-slate-700">
                {stats.avgDurationMin === null
                  ? "—"
                  : `${stats.avgDurationMin} min`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Deploy</p>
              <p className="text-sm font-semibold text-slate-700">
                {stats.lastDeployAt
                  ? formatRelativeTime(stats.lastDeployAt)
                  : "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            No deployments found for this repo in the selected period.
            {connectedAt && (
              <span> Connected {formatRelativeTime(connectedAt)}.</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function DisconnectedProviderCard({
  provider,
  onConnect,
}: {
  provider: "vercel" | "render";
  onConnect: () => void;
}) {
  const name = provider === "vercel" ? "Vercel" : "Render";
  const accentColor = provider === "vercel" ? "#374151" : "#46E3B7";
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors shadow-sm"
      onClick={onConnect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onConnect()}
      role="button"
      tabIndex={0}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-40"
        style={{ backgroundColor: accentColor }}
      />
      <div className="pt-5 pb-4 px-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm opacity-60">
            <ProviderIcon provider={provider} />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-700">{name}</p>
            <Badge
              variant="outline"
              className="text-xs mt-0.5 text-slate-400 border-slate-200"
            >
              Not connected
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onConnect();
          }}
        >
          <Link className="h-3.5 w-3.5 mr-1.5" />
          Connect {name}
        </Button>
      </div>
    </div>
  );
}

function DeploymentRow({ dep }: { dep: NormalisedDeployment }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-colors">
      <div
        className={`p-1.5 rounded-md shrink-0 ${dep.provider === "vercel" ? "bg-slate-100" : "bg-emerald-50"}`}
      >
        <ProviderIcon provider={dep.provider} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={dep.status} />
          <span
            className="text-xs font-mono text-slate-500 truncate max-w-[120px]"
            title={dep.branch}
          >
            {dep.branch}
          </span>
          <Badge
            variant="outline"
            className="text-xs capitalize border-slate-200"
          >
            {dep.environment}
          </Badge>
        </div>
        {dep.commitMessage && (
          <p
            className="text-xs text-slate-500 mt-0.5 truncate max-w-sm"
            title={dep.commitMessage}
          >
            {dep.commitMessage}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-0.5">
          {formatAbsDate(dep.startedAt)}
          {dep.commitSha && (
            <span className="font-mono ml-1.5 opacity-60">
              · {dep.commitSha.slice(0, 7)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <p className="text-sm font-medium text-slate-700">
          {formatDuration(dep.durationSec)}
        </p>
        <p className="text-xs text-slate-400">
          {formatRelativeTime(dep.startedAt)}
        </p>
      </div>
      {dep.url && (
        <a
          href={dep.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
          title="Open deployment"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export {
  ConnectModal,
  ConnectedProviderCard,
  DisconnectedProviderCard,
  DeploymentRow,
};
