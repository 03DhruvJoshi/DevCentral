import { useState, useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Trash2,
  Loader2,
  Search,
  TerminalSquare,
  LayoutGrid,
  SlidersHorizontal,
  Rows3,
  RotateCcw,
  GitBranch,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Badge } from "../../components/ui/badge.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog.js";
import CreateBlueprint from "./components/CreateBlueprint.js";

import type { Template } from "./components/types.js";
import {
  API_BASE_URL,
  fetchCategories,
  fetchTemplates,
} from "./components/types.js";

import RunScaffoldModal from "./components/RunScaffoldModal.js";
import EditTemplateModal from "./components/EditTemplateModal.js";

type SearchScope = "ALL" | "TITLE_DESC" | "YAML";
type ComplexityBand = "ALL" | "COMPACT" | "STANDARD" | "ADVANCED";
type FreshnessBand = "ALL" | "UPDATED_7D" | "UPDATED_30D" | "STALE_30D";
type ViewMode = "GRID" | "LIST";
type SortOption =
  | "A-Z"
  | "Z-A"
  | "NEWEST"
  | "OLDEST"
  | "COMPLEXITY_HIGH"
  | "COMPLEXITY_LOW";

type TemplateWithMeta = Template & {
  yamlLineCount: number;
  complexityBand: Exclude<ComplexityBand, "ALL">;
  updatedAtMs: number;
};

const getYamlLineCount = (yamlContent: string) =>
  yamlContent.trim() ? yamlContent.split(/\r?\n/).length : 0;

const getComplexityBand = (
  lineCount: number,
): Exclude<ComplexityBand, "ALL"> => {
  if (lineCount <= 40) return "COMPACT";
  if (lineCount <= 120) return "STANDARD";
  return "ADVANCED";
};

const formatRelativeDate = (iso: string) => {
  const target = new Date(iso).getTime();
  const diffDays = Math.floor((Date.now() - target) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

export function ScaffolderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [complexityFilter, setComplexityFilter] =
    useState<ComplexityBand>("ALL");
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessBand>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("A-Z");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/api/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: async () =>
      await queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const clearAllFilters = () => {
    setSearchTerm("");
    setSearchScope("ALL");
    setFilterCategory("ALL");
    setComplexityFilter("ALL");
    setFreshnessFilter("ALL");
    setSortBy("A-Z");
    setViewMode("GRID");
  };

  const templateMeta = useMemo<TemplateWithMeta[]>(
    () =>
      templates.map((template) => {
        const lineCount = getYamlLineCount(template.yaml);
        const updatedAtMs = new Date(
          template.updatedAt || template.createdAt,
        ).getTime();

        return {
          ...template,
          yamlLineCount: lineCount,
          complexityBand: getComplexityBand(lineCount),
          updatedAtMs,
        };
      }),
    [templates],
  );

  const allCategories = useMemo(
    () => [
      ...new Set([
        ...categories.map((c) => c.name),
        ...templateMeta.map((t) => t.categoryName),
      ]),
    ],
    [categories, templateMeta],
  );

  const processedTemplates = useMemo(() => {
    const now = Date.now();
    const q = searchTerm.trim().toLowerCase();

    const filtered = templateMeta.filter((template) => {
      const titleDesc =
        `${template.title} ${template.description}`.toLowerCase();
      const yamlText = template.yaml.toLowerCase();

      const searchMatch =
        !q ||
        (searchScope === "ALL" &&
          (titleDesc.includes(q) || yamlText.includes(q))) ||
        (searchScope === "TITLE_DESC" && titleDesc.includes(q)) ||
        (searchScope === "YAML" && yamlText.includes(q));

      const categoryMatch =
        filterCategory === "ALL" || template.categoryName === filterCategory;

      const complexityMatch =
        complexityFilter === "ALL" ||
        template.complexityBand === complexityFilter;

      const ageDays = Math.floor((now - template.updatedAtMs) / 86_400_000);
      const freshnessMatch =
        freshnessFilter === "ALL" ||
        (freshnessFilter === "UPDATED_7D" && ageDays <= 7) ||
        (freshnessFilter === "UPDATED_30D" && ageDays <= 30) ||
        (freshnessFilter === "STALE_30D" && ageDays > 30);

      return searchMatch && categoryMatch && complexityMatch && freshnessMatch;
    });

    const sorted = [...filtered];
    if (sortBy === "A-Z") sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "Z-A") sorted.sort((a, b) => b.title.localeCompare(a.title));
    if (sortBy === "NEWEST")
      sorted.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    if (sortBy === "OLDEST")
      sorted.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    if (sortBy === "COMPLEXITY_HIGH") {
      sorted.sort((a, b) => b.yamlLineCount - a.yamlLineCount);
    }
    if (sortBy === "COMPLEXITY_LOW") {
      sorted.sort((a, b) => a.yamlLineCount - b.yamlLineCount);
    }

    return sorted;
  }, [
    templateMeta,
    searchTerm,
    searchScope,
    filterCategory,
    complexityFilter,
    freshnessFilter,
    sortBy,
  ]);

  const activeFilterCount = [
    searchTerm.trim() !== "",
    searchScope !== "ALL",
    filterCategory !== "ALL",
    complexityFilter !== "ALL",
    freshnessFilter !== "ALL",
    sortBy !== "A-Z",
    viewMode !== "GRID",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 px-1">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-indigo-50/40 to-sky-50/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Scaffolder Marketplace
              </h1>
            </div>
            <p className="text-slate-750 text-sm max-w-2xl leading-relaxed">
              Build reusable golden-path blueprints for your internal developer
              platform. Discover, filter, inspect, and scaffold with a workflow
              designed for day-zero developer productivity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 py-1.5 px-3 border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="font-medium text-xs">GitHub Connected</span>
              <span className="h-2 w-2 rounded-full ml-0.5 bg-emerald-500 animate-pulse" />
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2  mb-6 bg-slate-100 p-1 rounded-xl h-20">
          <TabsTrigger
            value="browse"
            className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            Marketplace
          </TabsTrigger>
          <TabsTrigger
            value="create"
            className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            Create Blueprint
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="animate-in fade-in-50">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6 items-start">
            <Card className="border-slate-200 bg-slate-50/70 lg:sticky lg:top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                  Marketplace Filters
                </CardTitle>
                <CardDescription>
                  Filter and sort boilerplates to find the right one for your
                  needs.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Search Marketplace
                    </span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-650" />
                      <Input
                        placeholder="Search title, description, or YAML"
                        className="pl-9 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Sort Results
                    </span>

                    <select
                      className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                    >
                      <option value="A-Z">Title A-Z</option>
                      <option value="Z-A">Title Z-A</option>
                      <option value="NEWEST">Newest</option>
                      <option value="OLDEST">Oldest</option>
                      <option value="COMPLEXITY_HIGH">
                        Complexity High-Low
                      </option>
                      <option value="COMPLEXITY_LOW">
                        Complexity Low-High
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Filter By Date
                    </span>
                    <select
                      className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={freshnessFilter}
                      onChange={(e) =>
                        setFreshnessFilter(e.target.value as FreshnessBand)
                      }
                    >
                      <option value="ALL">All time</option>
                      <option value="UPDATED_7D">Updated in last 7 days</option>
                      <option value="UPDATED_30D">
                        Updated in last 30 days
                      </option>
                      <option value="STALE_30D">
                        Not updated in last 30 days
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Display Mode
                    </span>
                    <select
                      className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    >
                      <option value="GRID">Grid View</option>
                      <option value="LIST">List View</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Category
                    </span>
                    <select
                      className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <option value="ALL">All categories</option>
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                      Complexity
                    </span>
                    <select
                      className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={complexityFilter}
                      onChange={(e) =>
                        setComplexityFilter(e.target.value as ComplexityBand)
                      }
                    >
                      <option value="ALL">All complexities</option>
                      <option value="COMPACT">Compact (0-40 lines)</option>
                      <option value="STANDARD">Standard (41-120 lines)</option>
                      <option value="ADVANCED">Advanced (120+ lines)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-xs text-slate-750 flex items-center gap-1.5">
                    <Rows3 className="h-3.5 w-3.5" />
                    Filters apply to marketplace results only.
                  </p>

                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700"
                      >
                        {activeFilterCount} active filter
                        {activeFilterCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 w-full w-max border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200"
                      onClick={clearAllFilters}
                    >
                      <RotateCcw className="h-4 w-4 mr-1 " /> Reset Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {allCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const count = templateMeta.filter(
                      (template) => template.categoryName === cat,
                    ).length;
                    const selected = filterCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() =>
                          setFilterCategory((prev) =>
                            prev === cat ? "ALL" : cat,
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                  <p>Loading marketplace...</p>
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
                  Failed to load templates.
                </div>
              ) : processedTemplates.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-750">
                  No boilerplates match your filters.
                </div>
              ) : viewMode === "GRID" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {processedTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="flex flex-col h-full hover:shadow-md transition-all duration-200 border-slate-200 overflow-hidden group bg-white"
                    >
                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                      <CardHeader className="pb-3 pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 text-xs font-medium"
                          >
                            {template.categoryName}
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-650 hover:text-rose-500 hover:bg-rose-50 -mr-1 -mt-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm bg-white">
                              <DialogHeader>
                                <DialogTitle>Delete Template</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete{" "}
                                  <span className="font-semibold">
                                    {template.title}
                                  </span>
                                  ? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button className=" border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button
                                  type="submit"
                                  className="bg-rose-600 hover:bg-rose-700 text-white"
                                  onClick={() =>
                                    deleteTemplateMutation.mutate(template.id)
                                  }
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <CardTitle className="text-base font-semibold group-hover:text-blue-700 transition-colors leading-snug">
                          {template.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1.5 text-xs leading-relaxed">
                          {template.description}
                        </CardDescription>
                        <div className="flex flex-wrap items-center gap-1.5 pt-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              template.complexityBand === "COMPACT"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : template.complexityBand === "STANDARD"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                          >
                            {template.complexityBand.charAt(0) +
                              template.complexityBand.slice(1).toLowerCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-600 text-xs"
                          >
                            {template.yamlLineCount} lines
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-750 text-xs"
                          >
                            {formatRelativeDate(template.updatedAt)}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 pb-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="px-0 text-slate-650 hover:text-blue-600 h-auto text-xs gap-1.5 hover:bg-transparent"
                            >
                              <TerminalSquare className="h-3.5 w-3.5" /> Inspect
                              YAML Blueprint
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[96vw] !max-w-[96vw] sm:!max-w-[94vw] lg:!max-w-5xl xl:!max-w-6xl max-h-[88vh] overflow-hidden bg-white p-4 sm:p-6">
                            <DialogHeader>
                              <DialogTitle className="text-slate-900">
                                {template.title} — YAML Definition
                              </DialogTitle>
                            </DialogHeader>
                            <pre className="text-xs sm:text-sm font-mono text-slate-800 overflow-auto p-4 bg-slate-100 rounded-lg max-h-[calc(88vh-120px)] border border-slate-200">
                              <code>{template.yaml}</code>
                            </pre>
                          </DialogContent>
                        </Dialog>
                      </CardContent>

                      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                      <CardFooter className=" flex gap-2">
                        <EditTemplateModal
                          template={template}
                          categories={categories}
                        />
                        <RunScaffoldModal
                          templateId={template.id}
                          templateName={template.title}
                        />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {processedTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="border-slate-200 hover:shadow-sm transition-all duration-150 bg-white overflow-hidden"
                    >
                      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {template.title}
                              </h3>
                              <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 border-blue-100 text-xs"
                              >
                                {template.categoryName}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  template.complexityBand === "COMPACT"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : template.complexityBand === "STANDARD"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                              >
                                {template.complexityBand.charAt(0) +
                                  template.complexityBand
                                    .slice(1)
                                    .toLowerCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-750 line-clamp-1">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-650">
                              <span>{template.yamlLineCount} lines</span>
                              <span>·</span>
                              <span>
                                Updated {formatRelativeDate(template.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <EditTemplateModal
                              template={template}
                              categories={categories}
                            />
                            <RunScaffoldModal
                              templateId={template.id}
                              templateName={template.title}
                            />

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-650 hover:text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-sm bg-white">
                                <DialogHeader>
                                  <DialogTitle>Delete Template</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete{" "}
                                    <span className="font-semibold">
                                      {template.title}
                                    </span>
                                    ? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button
                                      className="border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200"
                                      onClick={() => {}}
                                    >
                                      Cancel
                                    </Button>
                                  </DialogClose>
                                  <Button
                                    type="submit"
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                    onClick={() =>
                                      deleteTemplateMutation.mutate(template.id)
                                    }
                                  >
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create" className="  animate-in fade-in-50">
          <CreateBlueprint categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
