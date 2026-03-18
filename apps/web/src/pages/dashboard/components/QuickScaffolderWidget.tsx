import { useState, useEffect } from "react";
import { PlayCircle, Box, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";

import { API_BASE_URL } from "../types.js";

export function QuickScaffoldWidget() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Hitting your existing templates backend route!
        const res = await fetch(`${API_BASE_URL}/api/templates`);
        if (res.ok) {
          const data = await res.json();
          // Only take the first 3 for the dashboard view
          setTemplates(data.slice(0, 3));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Box className="h-5 w-5 text-blue-500" /> Quick Scaffold
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {isLoading ? (
          <Loader2 className="animate-spin h-5 w-5 mx-auto text-muted-foreground" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates available.
          </p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/10"
            >
              <div>
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.categoryName}
                </p>
              </div>
              <Button size="sm" variant="ghost">
                <PlayCircle className="h-4 w-4 text-primary" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
