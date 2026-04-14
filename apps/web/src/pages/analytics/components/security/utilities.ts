const getRatingLetter = (val?: string) => {
  const map: Record<string, string> = {
    "1.0": "A",
    "2.0": "B",
    "3.0": "C",
    "4.0": "D",
    "5.0": "E",
  };
  return val && map[val] ? map[val] : "N/A";
};

const getRatingColor = (letter: string) => {
  if (letter === "A")
    return "text-emerald-500 bg-emerald-50 border-emerald-200";
  if (letter === "B" || letter === "C")
    return "text-amber-500 bg-amber-50 border-amber-200";
  return "text-rose-500 bg-rose-50 border-rose-200";
};

// Converts SonarQube "sqale_index" (minutes of debt) into human readable time
const formatTechDebt = (minutesStr?: string) => {
  const mins = Number.parseInt(minutesStr || "0", 10);
  if (mins === 0) return "0h";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 8); // Sonar assumes 8h work days
  if (days > 0) return `${days}d ${hours % 8}h`;
  return `${hours}h`;
};

const toNumber = (value?: string) => {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));

const getSeverityBadgeClass = (severity?: string) => {
  if (severity === "BLOCKER") {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }
  if (severity === "CRITICAL") {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }
  if (severity === "MAJOR") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  if (severity === "MINOR") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getIssueTypeBadgeClass = (type?: string) => {
  if (type === "VULNERABILITY") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (type === "BUG") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  if (type === "SECURITY_HOTSPOT") {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const getFileNameFromComponent = (component?: string) => {
  if (!component) return "unknown";
  const componentParts = component.split(":");
  const pathPart = componentParts.at(-1) ?? component;
  const pathSegments = pathPart.split("/");
  return pathSegments.at(-1) ?? pathPart;
};

const ITEMS_PER_TOP_CARD_PAGE = 5;
const ITEMS_PER_TOP_RULE_PAGE = 6;
const ISSUE_ROWS_PER_PAGE = 12;

export {
  getRatingLetter,
  getRatingColor,
  formatTechDebt,
  toNumber,
  clampPercent,
  getSeverityBadgeClass,
  getIssueTypeBadgeClass,
  getFileNameFromComponent,
  ITEMS_PER_TOP_CARD_PAGE,
  ITEMS_PER_TOP_RULE_PAGE,
  ISSUE_ROWS_PER_PAGE,
};
