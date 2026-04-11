// DashboardPage.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "use-debounce";
import GridLayout from "react-grid-layout";
import type { FallbackProps } from "react-error-boundary";
import { Button } from "../../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog.js";
import { Label } from "../../components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import {
  Loader2,
  LayoutGrid,
  X,
  Undo2,
  Redo2,
  Plus,
  Check,
  LayoutDashboard,
  Rocket,
  GitCommit,
  AlertTriangle,
  Box,
  Activity,
  Bug,
  GitPullRequest,
  GitBranch,
  BarChart2,
  Settings,
  Shield,
  CalendarDays,
  Clock,
} from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { ActionsWidget } from "./components/ActionsWidget.js";
import { QuickScaffoldWidget } from "./components/QuickScaffolderWidget.js";
import { RepoPulseWidget } from "./components/RepoPulseWidget.js";
import { PRVelocityWidget } from "./components/PRVelocityWidget.js";
import { DeliveryHealthWidget } from "./components/DeliveryHealthWidget.js";
import { PlatformSummaryWidget } from "./components/PlatformSummaryWidget.js";
import { DeploymentFeedWidget } from "./components/DeploymentFeedWidget.js";
import { RecentActivityWidget } from "./components/RecentActivityWidget.js";
import { DashboardProvider, useDashboardContext } from "./DashboardContext.js";
import { API_BASE_URL } from "./types.js";

// --- TYPES ---
type GridItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
};

type WidgetDefinition = {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  component: React.ComponentType;
};

type UserInfo = {
  name?: string;
  email?: string;
  githubUsername?: string;
  role?: string;
};

// --- WIDGET CATALOG ---
const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    id: "platform-summary",
    label: "Platform Overview",
    description: "Aggregate stats: repos, issues, PRs, and deployments.",
    category: "Platform",
    icon: LayoutDashboard,
    defaultW: 3,
    defaultH: 2,
    component: PlatformSummaryWidget,
  },
  {
    id: "deployment-feed",
    label: "Deployment Feed",
    description: "Recent deployment activity across your repositories.",
    category: "Platform",
    icon: Rocket,
    defaultW: 2,
    defaultH: 2,
    component: DeploymentFeedWidget,
  },
  {
    id: "recent-activity",
    label: "Recent Commits",
    description: "Latest commits and code changes from your team.",
    category: "Platform",
    icon: GitCommit,
    defaultW: 2,
    defaultH: 2,
    component: RecentActivityWidget,
  },
  {
    id: "action-center",
    label: "Action Center",
    description: "GitOps actions: workflow runs, PRs needing attention.",
    category: "GitOps",
    icon: AlertTriangle,
    defaultW: 2,
    defaultH: 2,
    component: ActionsWidget,
  },
  {
    id: "quick-scaffold",
    label: "Quick Scaffold",
    description: "Browse and launch project templates.",
    category: "Scaffolding",
    icon: Box,
    defaultW: 2,
    defaultH: 2,
    component: QuickScaffoldWidget,
  },
  {
    id: "dora-metrics",
    label: "Delivery Health",
    description: "CI/CD success rates, deploy frequency and MTTR.",
    category: "Analytics",
    icon: Activity,
    defaultW: 2,
    defaultH: 2,
    component: DeliveryHealthWidget,
  },
  {
    id: "repo-pulse",
    label: "GitHub Issues",
    description: "Open and recent GitHub issues for your repositories.",
    category: "Repository",
    icon: Bug,
    defaultW: 2,
    defaultH: 2,
    component: RepoPulseWidget,
  },
  {
    id: "pr-velocity",
    label: "PR Velocity",
    description: "Pull request review speed, stale PRs, and size distribution.",
    category: "Analytics",
    icon: GitPullRequest,
    defaultW: 2,
    defaultH: 2,
    component: PRVelocityWidget,
  },
];

const CATEGORY_ORDER = ["Platform", "GitOps", "Analytics", "Repository", "Scaffolding"];

// --- ERROR BOUNDARY FALLBACK ---
const WidgetErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="p-4 text-red-500">
    <p className="text-sm font-medium">Something went wrong with this widget</p>
    <pre className="text-xs mt-1 text-red-400">{String(error)}</pre>
    <Button onClick={resetErrorBoundary} variant="outline" size="sm" className="mt-2">
      Retry
    </Button>
  </div>
);

// --- RESIZE HANDLE ---
const renderResizeHandle = (
  axis: "s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne",
  ref: React.Ref<HTMLElement>,
) => (
  <span
    ref={ref}
    className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm bg-indigo-200/60 hover:bg-indigo-300/80 transition-colors"
    aria-label={`Resize handle ${axis}`}
  />
);

// --- BREAKPOINT HOOK ---
function useBreakpoint() {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setCols(1);
      } else if (window.innerWidth < 1200) {
        setCols(2);
      } else {
        setCols(3);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return cols;
}

// --- LAYOUT MANAGEMENT HOOK ---
function useDashboardLayout() {
  const [layout, setLayout] = useState<GridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<GridItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [debouncedLayout] = useDebounce(layout, 1000);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushToHistory = useCallback(
    (newLayout: GridItem[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, newLayout];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    if (canUndo) {
      const nextIndex = historyIndex - 1;
      const nextLayout = history[nextIndex];
      if (!nextLayout) return;
      setHistoryIndex(nextIndex);
      setLayout(nextLayout);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      const nextIndex = historyIndex + 1;
      const nextLayout = history[nextIndex];
      if (!nextLayout) return;
      setHistoryIndex(nextIndex);
      setLayout(nextLayout);
    }
  }, [canRedo, history, historyIndex]);

  const updateLayout = useCallback(
    (newLayout: GridItem[]) => {
      setLayout(newLayout);
      pushToHistory(newLayout);
    },
    [pushToHistory],
  );

  const getNextY = useCallback((items: GridItem[]) => {
    if (items.length === 0) return 0;
    return Math.max(...items.map((item) => item.y + item.h));
  }, []);

  const addWidget = useCallback(
    (widgetId: string) => {
      if (layout.some((item) => item.i === widgetId)) return;

      const catalogInfo = WIDGET_CATALOG.find((w) => w.id === widgetId);
      if (!catalogInfo) return;

      const newWidget: GridItem = {
        i: widgetId,
        x: 0,
        y: getNextY(layout),
        w: catalogInfo.defaultW,
        h: catalogInfo.defaultH,
      };

      if (catalogInfo.minW !== undefined) newWidget.minW = catalogInfo.minW;
      if (catalogInfo.minH !== undefined) newWidget.minH = catalogInfo.minH;
      if (catalogInfo.maxW !== undefined) newWidget.maxW = catalogInfo.maxW;
      if (catalogInfo.maxH !== undefined) newWidget.maxH = catalogInfo.maxH;

      updateLayout([...layout, newWidget]);
    },
    [getNextY, layout, updateLayout],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      updateLayout(layout.filter((w) => w.i !== widgetId));
    },
    [layout, updateLayout],
  );

  const saveLayoutToDB = useCallback(async (newLayout: GridItem[]) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("devcentral_token");
      await fetch(`${API_BASE_URL}/api/dashboard/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ widgets: newLayout }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedLayout.length > 0) {
      saveLayoutToDB(debouncedLayout);
    }
  }, [debouncedLayout, saveLayoutToDB]);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const token = localStorage.getItem("devcentral_token");
        const res = await fetch(`${API_BASE_URL}/api/dashboard/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.widgets && data.widgets.length > 0) {
          setLayout(data.widgets);
        } else {
          setLayout([
            { i: "platform-summary", x: 0, y: 0, w: 3, h: 2 },
            { i: "action-center", x: 0, y: 2, w: 2, h: 2 },
            { i: "dora-metrics", x: 2, y: 2, w: 1, h: 2 },
            { i: "deployment-feed", x: 0, y: 4, w: 2, h: 2 },
            { i: "quick-scaffold", x: 2, y: 4, w: 1, h: 2 },
          ]);
        }
      } catch (err) {
        console.error("Failed to load layout", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, []);

  return {
    layout,
    isLoading,
    isSaving,
    addWidget,
    removeWidget,
    updateLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

// --- GREETING HELPER ---
function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${firstName}!`;
}

// --- QUICK NAV ---
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "GitOps", href: "/gitops", icon: GitBranch },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Scaffolder", href: "/scaffolder", icon: Box },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

// --- INNER DASHBOARD (needs context) ---
function DashboardInner() {
  const {
    layout,
    isLoading,
    isSaving,
    addWidget,
    removeWidget,
    updateLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDashboardLayout();

  const { dateRange, setDateRange } = useDashboardContext();

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cols = useBreakpoint();
  const [gridWidth, setGridWidth] = useState(1200);
  const [user, setUser] = useState<UserInfo>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const raw = localStorage.getItem("devcentral_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw) as UserInfo);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!gridContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setGridWidth(Math.max(320, Math.floor(entry.contentRect.width - 32)));
    });

    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const isWidgetActive = useCallback(
    (widgetId: string) => layout.some((w) => w.i === widgetId),
    [layout],
  );

  const toggleWidget = useCallback(
    (widgetId: string, checked: boolean) => {
      checked ? addWidget(widgetId) : removeWidget(widgetId);
    },
    [addWidget, removeWidget],
  );

  const firstName = user.name?.split(" ")[0] ?? user.githubUsername ?? "Developer";
  const isAdmin = user.role === "ADMIN";

  const dateRangeOptions: { value: string; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "14d", label: "Last 14 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
  ];

  // Group catalog by category
  const catalogByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    widgets: WIDGET_CATALOG.filter((w) => w.category === cat),
  })).filter((g) => g.widgets.length > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white leading-snug">
              {getGreeting(firstName)}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Here's your platform at a glance.
            </p>
          </div>

          {/* Mini stat chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-xs text-white backdrop-blur-sm">
              <CalendarDays className="h-3.5 w-3.5 text-indigo-300" />
              {currentTime.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-xs text-white backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-indigo-300" />
              {currentTime.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full px-3 py-1.5 text-xs text-indigo-200 backdrop-blur-sm">
              <LayoutDashboard className="h-3.5 w-3.5" />
              DevCentral IDP
            </div>
          </div>
        </div>

        {/* Platform Quick Nav */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((nav) => (
            <a
              key={nav.href}
              href={nav.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white hover:bg-white/20 hover:border-white/30 transition-all backdrop-blur-sm"
            >
              <nav.icon className="h-3.5 w-3.5 text-indigo-300" />
              {nav.label}
            </a>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-700">My Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="h-9 w-36 border-slate-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo last layout change"
            className="border-slate-200"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo last layout change"
            className="border-slate-200"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50">
                <LayoutGrid className="h-4 w-4 text-indigo-600" />
                Manage Widgets
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-indigo-600" />
                  Widget Catalog
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
                {catalogByCategory.map(({ category, widgets }) => (
                  <div key={category}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {category}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {widgets.map((widget) => {
                        const active = isWidgetActive(widget.id);
                        return (
                          <button
                            type="button"
                            key={widget.id}
                            onClick={() => toggleWidget(widget.id, !active)}
                            className={`flex items-center justify-between border rounded-xl p-3 text-left transition-all ${
                              active
                                ? "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50"
                                : "border-slate-100 bg-slate-50/60 hover:bg-slate-100/60"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${
                                  active ? "bg-indigo-100" : "bg-slate-100"
                                }`}
                              >
                                <widget.icon
                                  className={`h-4 w-4 ${
                                    active ? "text-indigo-600" : "text-slate-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <Label
                                  className={`font-semibold text-sm cursor-pointer ${
                                    active ? "text-indigo-900" : "text-slate-700"
                                  }`}
                                >
                                  {widget.label}
                                </Label>
                                <p className="text-xs text-muted-foreground truncate">
                                  {widget.description}
                                </p>
                              </div>
                            </div>
                            {active ? (
                              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 shrink-0 ml-2">
                                <Check className="h-4 w-4" /> Added
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0 ml-2">
                                <Plus className="h-4 w-4" /> Add
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isSaving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving layout...
                  </span>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* DRAG AND DROP GRID */}
      {layout.length > 0 ? (
        <div
          ref={gridContainerRef}
          className="bg-slate-50/50 rounded-2xl p-4 min-h-[500px] border border-dashed border-slate-200"
        >
          <GridLayout
            className="layout"
            layout={layout}
            width={gridWidth}
            gridConfig={{
              cols,
              rowHeight: 150,
              margin: [20, 20],
              containerPadding: [0, 0],
            }}
            dragConfig={{
              enabled: true,
              handle: ".drag-handle",
              cancel: ".widget-close-btn",
            }}
            resizeConfig={{
              enabled: true,
              handles: ["se"],
              handleComponent: renderResizeHandle,
            }}
            onLayoutChange={(newLayout) =>
              updateLayout(newLayout as GridItem[])
            }
            onDragStop={(newLayout) => updateLayout(newLayout as GridItem[])}
            onResizeStop={(newLayout) => updateLayout(newLayout as GridItem[])}
          >
            {layout.map((widget) => {
              const widgetDef = WIDGET_CATALOG.find((w) => w.id === widget.i);
              const WidgetIcon = widgetDef?.icon;
              return (
                <div
                  key={widget.i}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col overflow-hidden min-h-0"
                >
                  {/* Drag Handle */}
                  <div className="drag-handle h-9 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100 cursor-grab active:cursor-grabbing flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                      {WidgetIcon && (
                        <WidgetIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-500 truncate">
                        {widgetDef?.label ?? widget.i}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="widget-close-btn h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-200/80"
                      onClick={() => removeWidget(widget.i)}
                      aria-label={`Close ${widget.i} widget`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Widget Content */}
                  <div className="flex-1 p-3 overflow-auto min-h-0">
                    <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
                      {widgetDef ? (
                        <widgetDef.component />
                      ) : (
                        <div className="text-sm text-muted-foreground">Unknown Widget</div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              );
            })}
          </GridLayout>
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <LayoutGrid className="h-16 w-16 text-indigo-200" />
          <h3 className="text-xl font-semibold text-slate-700">
            Build your workspace
          </h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Add widgets to get started. Each widget shows real-time data from
            your platform.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                Add Widgets
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-indigo-600" />
                  Widget Catalog
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
                {catalogByCategory.map(({ category, widgets }) => (
                  <div key={category}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {category}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {widgets.map((widget) => {
                        const active = isWidgetActive(widget.id);
                        return (
                          <button
                            type="button"
                            key={widget.id}
                            onClick={() => toggleWidget(widget.id, !active)}
                            className={`flex items-center justify-between border rounded-xl p-3 text-left transition-all ${
                              active
                                ? "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50"
                                : "border-slate-100 bg-slate-50/60 hover:bg-slate-100/60"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`p-1.5 rounded-lg shrink-0 ${
                                  active ? "bg-indigo-100" : "bg-slate-100"
                                }`}
                              >
                                <widget.icon
                                  className={`h-4 w-4 ${
                                    active ? "text-indigo-600" : "text-slate-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <Label
                                  className={`font-semibold text-sm cursor-pointer ${
                                    active ? "text-indigo-900" : "text-slate-700"
                                  }`}
                                >
                                  {widget.label}
                                </Label>
                                <p className="text-xs text-muted-foreground truncate">
                                  {widget.description}
                                </p>
                              </div>
                            </div>
                            {active ? (
                              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 shrink-0 ml-2">
                                <Check className="h-4 w-4" /> Added
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0 ml-2">
                                <Plus className="h-4 w-4" /> Add
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// --- MAIN EXPORT (wraps in DashboardProvider) ---
export function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
