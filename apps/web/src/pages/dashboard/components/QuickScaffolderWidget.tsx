import { useState, useEffect, useMemo } from "react";
import { PlayCircle, Box, Loader2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { API_BASE_URL } from "../types.js";

type Template = {
  id: number;
  title: string;
  description?: string;
  categoryName: string;
};

type Category = {
  id: number;
  name: string;
};

export function QuickScaffoldWidget() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [templatesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/templates`),
          fetch(`${API_BASE_URL}/api/categories`),
        ]);

        if (!templatesRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to load scaffolder data");
        }

        const templatesData = (await templatesRes.json()) as Template[];
        const categoriesData = (await categoriesRes.json()) as Category[];

        setTemplates(templatesData);
        setCategories(categoriesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeCategory !== "All") {
      result = result.filter((t) => t.categoryName === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }
    return result.slice(0, 4);
  }, [templates, activeCategory, search]);

  const categoryNames = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories],
  );

  return (
    <Card className="flex flex-col h-full border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between text-blue-800">
          <span className="inline-flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" /> Quick Scaffold
          </span>
          <Badge variant="outline" className="border-blue-300 text-blue-700">
            {templates.length} templates
          </Badge>
        </CardTitle>

        {/* Search */}
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-blue-200 bg-white pl-8 pr-3 text-sm text-slate-800 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Category filters */}
        {!isLoading && categoryNames.length > 1 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {categoryNames.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!isLoading && !error && filteredTemplates.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No templates match your search.
          </p>
        )}

        {!isLoading &&
          !error &&
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border border-blue-100 rounded-xl bg-white/90 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate text-slate-800">
                  {template.title}
                </p>
                {template.description ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {template.description}
                  </p>
                ) : (
                  <Badge
                    variant="outline"
                    className="mt-0.5 text-xs border-blue-200 text-blue-600 h-4 px-1"
                  >
                    {template.categoryName}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/scaffolder";
                }}
                className="ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors shrink-0"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Use
              </button>
            </div>
          ))}

        {!isLoading && !error && templates.length > 0 && (
          <button
            type="button"
            onClick={() => {
              window.location.href = "/scaffolder";
            }}
            className="mt-auto w-full py-2 text-xs text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors"
          >
            View all templates →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
