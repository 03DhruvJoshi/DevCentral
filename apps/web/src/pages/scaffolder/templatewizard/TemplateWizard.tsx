import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wand2,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Globe,
  Smartphone,
  Server,
  BrainCircuit,
  Network,
  Box,
  Zap,
  Layers,
  Code2,
  Package,
  Rocket,
  GitBranch,
  Activity,
  BarChart3,
  FlaskConical,
  Cpu,
  Database,
  Shield,
  Lock,
  TestTube2,
  Workflow,
} from "lucide-react";
import { Button } from "../../../components/ui/button.js";
import { Badge } from "../../../components/ui/badge.js";
import { Switch } from "../../../components/ui/switch.js";
import { Label } from "../../../components/ui/label.js";
import { cn } from "../../../lib/utils.js";
import {
  fetchWizardCategories,
  fetchWizardFrameworks,
  fetchWizardOptions,
  generateWizardYaml,
  type WizardCatalogCategory,
  type WizardFramework,
  type WizardOption,
} from "../components/types.js";

// ── Icon map (DB stores name strings, UI resolves to components) ──────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Globe: <Globe className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Server: <Server className="w-5 h-5" />,
  BrainCircuit: <BrainCircuit className="w-5 h-5" />,
  Network: <Network className="w-5 h-5" />,
  Box: <Box className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Code2: <Code2 className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  Rocket: <Rocket className="w-5 h-5" />,
  GitBranch: <GitBranch className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  FlaskConical: <FlaskConical className="w-5 h-5" />,
  Cpu: <Cpu className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Lock: <Lock className="w-5 h-5" />,
  TestTube2: <TestTube2 className="w-5 h-5" />,
  Workflow: <Workflow className="w-5 h-5" />,
};

function resolveIcon(name?: string | null): React.ReactNode {
  return (name && ICON_MAP[name]) ?? <Box className="w-5 h-5" />;
}

// ── Tier / popularity helpers ─────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  INFRASTRUCTURE: "bg-sky-50 text-sky-700 border-sky-200",
  QUALITY: "bg-violet-50 text-violet-700 border-violet-200",
  SECURITY: "bg-rose-50 text-rose-700 border-rose-200",
  FEATURES: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TIER_LABELS: Record<string, string> = {
  INFRASTRUCTURE: "Infra",
  QUALITY: "Quality",
  SECURITY: "Security",
  FEATURES: "Feature",
};

const POPULARITY_BADGE: Record<string, { label: string; cls: string }> = {
  popular: {
    label: "Popular",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  trending: {
    label: "Trending",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  enterprise: {
    label: "Enterprise",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ["Category", "Framework", "Configure"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={label}
            className="flex items-center gap-1 flex-1 last:flex-none"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                  done
                    ? "bg-indigo-600 text-white"
                    : active
                      ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  active
                    ? "text-slate-800"
                    : done
                      ? "text-indigo-600"
                      : "text-slate-400",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-1",
                  done ? "bg-indigo-300" : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TemplateWizardProps {
  onGenerate: (yamlString: string) => void;
}

export function TemplateWizard({ onGenerate }: TemplateWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] =
    useState<WizardCatalogCategory | null>(null);
  const [selectedFramework, setSelectedFramework] =
    useState<WizardFramework | null>(null);
  const [toggles, setToggles] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["wizard-categories"],
    queryFn: fetchWizardCategories,
    staleTime: 10 * 60 * 1000,
  });

  const { data: frameworks = [], isLoading: loadingFrameworks } = useQuery({
    queryKey: ["wizard-frameworks"],
    queryFn: fetchWizardFrameworks,
    staleTime: 10 * 60 * 1000,
  });

  const { data: options = [], isLoading: loadingOptions } = useQuery({
    queryKey: ["wizard-options", selectedFramework?.id],
    queryFn: () => fetchWizardOptions(selectedFramework!.id),
    enabled: Boolean(selectedFramework),
    staleTime: 10 * 60 * 1000,
  });

  const filteredFrameworks = frameworks.filter(
    (f) => f.categoryId === selectedCategory?.id,
  );

  // Auto-enable defaults when options load
  useEffect(() => {
    if (!selectedFramework || options.length === 0) return;
    setToggles((prev) => {
      if (prev.size > 0) return prev;
      const defaults = options.filter((o) => o.defaultEnabled).map((o) => o.id);
      return defaults.length > 0 ? new Set(defaults) : prev;
    });
  }, [selectedFramework, options]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCategorySelect = (cat: WizardCatalogCategory) => {
    setSelectedCategory(cat);
    setSelectedFramework(null);
    setToggles(new Set());
    setGenerated(false);
    setStep(1);
  };

  const handleFrameworkSelect = (fw: WizardFramework) => {
    setSelectedFramework(fw);
    setToggles(new Set());
    setGenerated(false);
    setStep(2);
  };

  const handleToggle = (id: string, checked: boolean) => {
    setToggles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    setGenerated(false);
  };

  const handleGenerate = async () => {
    if (!selectedFramework) return;
    setGenerating(true);
    try {
      const yaml = await generateWizardYaml(selectedFramework.id, [...toggles]);
      onGenerate(yaml);
      setGenerated(true);
    } catch {
      // Upstream error surfaces in parent
    } finally {
      setGenerating(false);
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    setGenerated(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      <StepIndicator current={step} />

      {/* ── Step 0: Category ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            What are you building?
          </p>

          {loadingCategories ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading categories…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className="group w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 p-3.5 text-left transition-all duration-150"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-indigo-100 shrink-0 transition-colors">
                    <span className="text-slate-500 group-hover:text-indigo-600 transition-colors">
                      {resolveIcon(cat.icon)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {cat.label}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Framework ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1 text-center">
              Choose a Framework
            </span>
            <div className="w-12" />
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 flex items-center gap-2">
            <span className="text-indigo-500">
              {resolveIcon(selectedCategory?.icon)}
            </span>
            <span className="text-xs font-medium text-indigo-700">
              {selectedCategory?.label}
            </span>
          </div>

          {loadingFrameworks ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading frameworks…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-0.5">
              {filteredFrameworks.map((fw) => {
                const pop = fw.popularity
                  ? POPULARITY_BADGE[fw.popularity]
                  : null;
                return (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => handleFrameworkSelect(fw)}
                    className="group w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 p-3 text-left transition-all duration-150"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 shrink-0 transition-colors">
                      <span className="text-slate-500 group-hover:text-indigo-600 transition-colors">
                        {resolveIcon(fw.icon)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {fw.label}
                        </span>
                        {fw.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border-slate-800 bg-blue-100 text-slate-800 border-slate-200">
                            {fw.badge}
                          </span>
                        )}
                        {pop && (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0", pop.cls)}
                          >
                            {pop.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {fw.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Configure + Generate ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-1 text-center">
              Configure Options
            </span>
            <div className="w-12" />
          </div>

          {/* Selected framework chip */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 flex items-center gap-2">
            <span className="text-indigo-500">
              {resolveIcon(selectedFramework?.icon)}
            </span>
            <span className="text-xs font-semibold text-indigo-700">
              {selectedFramework?.label}
            </span>
            {selectedFramework?.badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-white text-slate-500 border-slate-200 ml-auto">
                {selectedFramework.badge}
              </span>
            )}
          </div>

          {/* Options */}
          {loadingOptions ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading options…</span>
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              No configurable options for this framework.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {options.map((opt: WizardOption) => {
                const isOn = toggles.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => handleToggle(opt.id, !isOn)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl",
                      isOn
                        ? "bg-indigo-50 hover:bg-indigo-50"
                        : "bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Label
                          htmlFor={`opt-${opt.id}`}
                          className="text-sm font-medium text-slate-800 cursor-pointer"
                        >
                          {opt.label}
                        </Label>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            TIER_COLORS[opt.tier] ?? "",
                          )}
                        >
                          {TIER_LABELS[opt.tier] ?? opt.tier}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {opt.description}
                      </p>
                    </div>
                    <Switch
                      id={`opt-${opt.id}`}
                      checked={isOn}
                      onCheckedChange={(checked) =>
                        handleToggle(opt.id, checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Active toggles summary */}
          {toggles.size > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-700 flex flex-wrap gap-1.5 items-center">
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Includes:</span>
              {[...toggles].map((id) => {
                const opt = options.find((o) => o.id === id);
                return (
                  <span
                    key={id}
                    className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium"
                  >
                    {opt?.label ?? id}
                  </span>
                );
              })}
            </div>
          )}

          {/* Generate */}
          <Button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className={cn(
              "w-full gap-2 text-white transition-colors",
              generated
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700",
            )}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : generated ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                YAML Injected — Click to Regenerate
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate YAML
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
