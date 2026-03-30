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
  Loader2,
  LayoutGrid,
  Columns3Cog,
  X,
  Undo2,
  Redo2,
  Plus,
  Check,
} from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { ActionsWidget } from "./components/ActionsWidget.js";
import { QuickScaffoldWidget } from "./components/QuickScaffolderWidget.js";
import { RepoPulseWidget } from "./components/RepoPulseWidget.js";
import { PRVelocityWidget } from "./components/PRVelocityWidget.js";
import { DeliveryHealthWidget } from "./components/DeliveryHealthWidget.js";
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
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  component: React.ComponentType;
};

// --- WIDGET CATALOG ---
const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    id: "action-center",
    label: "Action Center (GitOps)",
    defaultW: 2,
    defaultH: 2,
    component: ActionsWidget,
  },
  {
    id: "quick-scaffold",
    label: "Quick Scaffold (Templates)",
    defaultW: 1,
    defaultH: 2,
    component: QuickScaffoldWidget,
  },
  {
    id: "dora-metrics",
    label: "Delivery Health (CI/CD)",
    defaultW: 1,
    defaultH: 2,
    component: DeliveryHealthWidget,
  },
  {
    id: "repo-pulse",
    label: "GitHub Issues (Repo)",
    defaultW: 2,
    defaultH: 2,
    component: RepoPulseWidget,
  },
  {
    id: "pr-velocity",
    label: "PR Velocity (Review Flow)",
    defaultW: 2,
    defaultH: 2,
    component: PRVelocityWidget,
  },
];

// --- ERROR BOUNDARY FALLBACK ---
const WidgetErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="p-4 text-red-500">
    <p>Something went wrong with this widget:</p>
    <pre className="text-xs">{String(error)}</pre>
    <Button onClick={resetErrorBoundary} variant="outline" size="sm">
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
    className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm bg-muted-foreground/40"
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
    if (items.length === 0) {
      return 0;
    }

    return Math.max(...items.map((item) => item.y + item.h));
  }, []);

  const addWidget = useCallback(
    (widgetId: string) => {
      if (layout.some((item) => item.i === widgetId)) {
        return;
      }

      const catalogInfo = WIDGET_CATALOG.find((w) => w.id === widgetId);
      if (!catalogInfo) return;

      const newWidgetBase: GridItem = {
        i: widgetId,
        x: 0,
        y: getNextY(layout),
        w: catalogInfo.defaultW,
        h: catalogInfo.defaultH,
      };

      const newWidget: GridItem = { ...newWidgetBase };

      if (catalogInfo.minW === undefined) {
        // no-op
      } else {
        newWidget.minW = catalogInfo.minW;
      }

      if (catalogInfo.minH === undefined) {
        // no-op
      } else {
        newWidget.minH = catalogInfo.minH;
      }

      if (catalogInfo.maxW === undefined) {
        // no-op
      } else {
        newWidget.maxW = catalogInfo.maxW;
      }

      if (catalogInfo.maxH === undefined) {
        // no-op
      } else {
        newWidget.maxH = catalogInfo.maxH;
      }

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.widgets && data.widgets.length > 0) {
          setLayout(data.widgets);
        } else {
          setLayout([
            { i: "action-center", x: 0, y: 0, w: 2, h: 2 },
            { i: "quick-scaffold", x: 2, y: 0, w: 1, h: 2 },
            { i: "dora-metrics", x: 0, y: 2, w: 1, h: 2 },
            { i: "repo-pulse", x: 1, y: 2, w: 2, h: 2 },
            { i: "pr-velocity", x: 0, y: 4, w: 2, h: 2 },
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

// --- MAIN COMPONENT ---
export function DashboardPage() {
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
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cols = useBreakpoint();
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    if (!gridContainerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER & CONTROLS */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Drag and resize widgets to customise your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo last layout change"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo last layout change"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Manage Widgets
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Widget Preferences</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                {WIDGET_CATALOG.map((widget) => (
                  <button
                    type="button"
                    key={widget.id}
                    onClick={() =>
                      toggleWidget(widget.id, !isWidgetActive(widget.id))
                    }
                    className="flex items-center justify-between border p-3 rounded bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <Label className="font-bold">{widget.label}</Label>
                    {isWidgetActive(widget.id) ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Add
                      </span>
                    )}
                  </button>
                ))}
                {isSaving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
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
          className="bg-muted/10 rounded-xl p-4 min-h-[500px] border border-dashed"
        >
          <GridLayout
            className="layout"
            layout={layout}
            width={gridWidth}
            gridConfig={{
              cols,
              rowHeight: 150,
              margin: [24, 24],
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
              return (
                <div
                  key={widget.i}
                  className="bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden min-h-0"
                >
                  {/* Drag Handle + close */}
                  <div className="drag-handle h-8 bg-muted/50 border-b cursor-grab active:cursor-grabbing flex items-center justify-between px-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="widget-close-btn h-6 w-6 absolute right-2"
                      onClick={() => removeWidget(widget.i)}
                      aria-label={`Close ${widget.i} widget`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Widget Content */}
                  <div className="flex-1 p-4 overflow-auto min-h-0">
                    <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
                      {widgetDef ? (
                        <widgetDef.component />
                      ) : (
                        <div>Unknown Widget</div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              );
            })}
          </GridLayout>
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Columns3Cog className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Your dashboard is empty.</p>
          <p className="text-sm">Click "Manage Widgets" to enable widgets.</p>
        </div>
      )}
    </div>
  );
}
