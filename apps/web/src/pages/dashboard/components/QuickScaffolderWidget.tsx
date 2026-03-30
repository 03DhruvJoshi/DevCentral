import { type ReactNode, useState, useEffect } from "react";
import { PlayCircle, Box, Loader2, Sparkles, Tag } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";
import { Badge } from "../../../components/ui/badge.js";

import { API_BASE_URL } from "../types.js";

type Template = {
  id: number;
  title: string;
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

        setTemplates(templatesData.slice(0, 4));
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

  let templatesContent: ReactNode;

  if (isLoading) {
    templatesContent = (
      <Loader2 className="animate-spin h-5 w-5 mx-auto text-blue-600" />
    );
  } else if (error) {
    templatesContent = <p className="text-sm text-red-600">{error}</p>;
  } else if (templates.length === 0) {
    templatesContent = (
      <p className="text-sm text-muted-foreground">No templates available.</p>
    );
  } else {
    templatesContent = templates.map((template) => (
      <div
        key={template.id}
        className="flex items-center justify-between p-3 border border-blue-100 rounded-lg bg-white/90"
      >
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{template.title}</p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
            <Tag className="h-3 w-3" />
            {template.categoryName}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-200 hover:bg-blue-50"
        >
          <PlayCircle className="h-4 w-4 text-blue-600" />
        </Button>
      </div>
    ));
  }

  return (
    <Card className="flex flex-col h-full border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between text-blue-800">
          <span className="inline-flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" /> Quick Scaffold
          </span>
          <Badge variant="outline" className="border-blue-300 text-blue-700">
            {categories.length} categories
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {templatesContent}

        {!isLoading && !error && (
          <div className="mt-auto rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-800 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Draft scaffolds faster with reusable template starters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
