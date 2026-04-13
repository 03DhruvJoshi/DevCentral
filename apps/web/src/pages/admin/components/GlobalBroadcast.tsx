import { useState, useEffect } from "react";
import { AlertTriangle, X, Info, Zap } from "lucide-react";
import { API_BASE_URL } from "../types.js";

type Severity = "INFO" | "WARNING" | "CRITICAL";

const SEVERITY_BG: Record<Severity, string> = {
  INFO: "bg-blue-600",
  WARNING: "bg-orange-500",
  CRITICAL: "bg-red-600",
};

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "INFO") return <Info className="h-5 w-5 shrink-0" />;
  if (severity === "CRITICAL")
    return <Zap className="animate-pulse h-5 w-5 shrink-0" />;
  return <AlertTriangle className="h-5 w-5 shrink-0" />;
}

export function GlobalBroadcast() {
  const [message, setMessage] = useState<string>("");
  const [severity, setSeverity] = useState<Severity>("INFO");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchBroadcast = async () => {
      try {
        const token = localStorage.getItem("devcentral_token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/platform/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const features: Record<string, string> = await res.json();
          const msg = features["BROADCAST_MESSAGE"] ?? "";
          const sev = features["BROADCAST_SEVERITY"] ?? "INFO";

          if (msg.trim() !== "") {
            setMessage(msg);
            if (["INFO", "WARNING", "CRITICAL"].includes(sev)) {
              setSeverity(sev as Severity);
            }
          } else {
            setMessage("");
          }
        }
      } catch (error) {
        console.error("Failed to fetch broadcast message", error);
      }
    };

    fetchBroadcast();
    const interval = setInterval(fetchBroadcast, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!message || !isVisible) return null;

  const bgClass = SEVERITY_BG[severity] ?? SEVERITY_BG.INFO;

  return (
    <div
      className={`${bgClass} text-white px-4 py-2.5 shadow-sm flex items-center justify-between z-50 relative`}
    >
      <div className="flex items-center gap-3 w-full justify-center max-w-7xl mx-auto">
        <SeverityIcon severity={severity} />
        <p className="text-sm font-medium">
          <strong className="font-bold mr-1.5 tracking-wide">PLATFORM ALERT:</strong>
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="text-white/70 hover:text-white transition-colors ml-4 shrink-0 rounded-md p-0.5 hover:bg-white/10"
        aria-label="Dismiss broadcast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
