import {
  Pencil,
  CheckCircle2,
  AlertCircle,
  TerminalSquare,
  FileCode2,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import yaml from "js-yaml";

import { Label } from "../../../components/ui/label.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Badge } from "../../../components/ui/badge.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../../components/ui/dialog.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import { Textarea } from "../../../components/ui/textarea.js";

import type { Category, Template } from "./../components/types.js";
import { API_BASE_URL } from "./../components/types.js";

const getYamlLineCount = (yamlContent: string) =>
  yamlContent.trim() ? yamlContent.split(/\r?\n/).length : 0;

const getComplexityLabel = (lineCount: number) => {
  if (lineCount <= 40) return "Compact";
  if (lineCount <= 120) return "Standard";
  return "Advanced";
};

function EditTemplateModal({
  template,
  categories,
}: {
  template: Template;
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description);
  const [categoryName, setCategoryName] = useState(template.categoryName);
  const [yamlContent, setYamlContent] = useState(template.yaml);

  const [error, setError] = useState<string | null>(null);
  const [yamlSyntaxError, setYamlSyntaxError] = useState<string | null>(null);

  const yamlLineCount = getYamlLineCount(yamlContent);
  const yamlComplexity = getComplexityLabel(yamlLineCount);

  // Validate on load and on change
  useEffect(() => {
    try {
      yaml.load(yamlContent);
      setYamlSyntaxError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid YAML syntax";
      setYamlSyntaxError(`Syntax Error: ${message}`);
    }
  }, [yamlContent]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(template.title);
    setDescription(template.description);
    setCategoryName(template.categoryName);
    setYamlContent(template.yaml);
    setError(null);
  }, [isOpen, template]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("devcentral_token");
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            description,
            categoryName,
            yaml: yamlContent,
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "Failed to update template",
        );
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsOpen(false);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Failed to update template",
      );
    },
  });

  const handleUpdate = () => {
    if (yamlSyntaxError) return;
    setError(null);
    updateMutation.mutate();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
        >
          <Pencil className="mr-2 h-4 w-4 text-slate-650" /> Edit Info
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[96vw] !max-w-[96vw] sm:!max-w-[94vw] lg:!max-w-5xl xl:!max-w-6xl max-h-[88vh] overflow-hidden flex flex-col p-0 bg-slate-50">
        <DialogHeader className="p-6 bg-white border-b border-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">
                Edit Blueprint: {template.title}
              </DialogTitle>
              <DialogDescription>
                Update metadata and validate YAML before saving changes.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-700"
              >
                <Layers className="w-3.5 h-3.5 mr-1" /> {yamlLineCount} lines
              </Badge>
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-700"
              >
                <FileCode2 className="w-3.5 h-3.5 mr-1" /> {yamlComplexity}
              </Badge>
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700"
              >
                {categoryName}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Form */}
          <div className="p-6 space-y-5 lg:w-[40%] bg-white">
            {error && (
              <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded-md border border-rose-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-600">Template Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 w-full ">Category</Label>
              <Select value={categoryName} onValueChange={setCategoryName}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                className="resize-none bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Right Column: Code Editor */}
          <div className="px-4  space-y-4 lg:w-[60%] flex flex-col bg-slate-50">
            <div className="flex items-center justify-between">
              <Label className="text-slate-600 flex items-center gap-2">
                <TerminalSquare className="w-4 h-4" /> YAML Configuration
              </Label>
              {yamlSyntaxError ? (
                <Badge
                  variant="destructive"
                  className="bg-rose-100 text-rose-800 border-rose-200 shadow-none"
                >
                  <AlertCircle className="w-3 h-3 mr-1" /> Invalid YAML
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shadow-none">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid Syntax
                </Badge>
              )}
            </div>

            <div className="flex-1 relative flex flex-col rounded-lg overflow-hidden border border-slate-200">
              <Textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                required
                spellCheck="false"
                className="flex-1 font-mono text-sm bg-slate-100 text-slate-800 p-4 border-0 rounded-none focus-visible:ring-0 min-h-[300px]"
              />
              {yamlSyntaxError && (
                <div className="bg-rose-50 border-t-2 border-rose-500 text-rose-900 p-4 font-mono text-sm max-h-[150px] overflow-auto">
                  {yamlSyntaxError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unified Footer */}
        <DialogFooter className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
          <Button
            type="button"
            className="border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200"
            onClick={() => setIsOpen(false)}
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={updateMutation.isPending || !!yamlSyntaxError}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateMutation.isPending ? (
              <Pencil className="animate-pulse mr-2 h-4 w-4" />
            ) : (
              "Save Blueprint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditTemplateModal;
