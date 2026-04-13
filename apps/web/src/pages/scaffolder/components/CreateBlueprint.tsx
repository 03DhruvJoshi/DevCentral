import { useState, type ChangeEvent } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import yaml from "js-yaml";
import {
  Loader2,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Wand2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Badge } from "../../../components/ui/badge.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog.js";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form.js";
import { Textarea } from "../../../components/ui/textarea.js";
import { TemplateWizard } from "../templatewizard/TemplateWizard.js";

import { formSchema } from "../../../zod/ScaffolderZod.js";
import type { Category, Template } from "../components/types.js";
import { API_BASE_URL } from "../components/types.js";

type ComplexityBand = "ALL" | "COMPACT" | "STANDARD" | "ADVANCED";

const getYamlLineCount = (yamlContent: string) =>
  yamlContent.trim() ? yamlContent.split(/\r?\n/).length : 0;

const getComplexityBand = (
  lineCount: number,
): Exclude<ComplexityBand, "ALL"> => {
  if (lineCount <= 40) return "COMPACT";
  if (lineCount <= 120) return "STANDARD";
  return "ADVANCED";
};

export default function CreateBlueprint({
  categories,
}: Readonly<{
  categories: Category[];
}>) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(
    null,
  );
  const [createTemplateError, setCreateTemplateError] = useState<string | null>(
    null,
  );
  const [yamlSyntaxError, setYamlSyntaxError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      yamlContent: "",
      newCategoryName: "",
      categorySelection: "",
    },
  });

  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string): Promise<Category> => {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: async (newCategory) => {
      setCreateCategoryError(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      form.setValue("categorySelection", newCategory.name);
      form.setValue("newCategoryName", "");
      setShowCreateCategory(false);
    },
    onError: (err) =>
      setCreateCategoryError(err instanceof Error ? err.message : String(err)),
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string | null;
      categoryName: string;
      yaml: string;
    }): Promise<Template> => {
      const response = await fetch(`${API_BASE_URL}/api/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let message = "Failed to create template";
        try {
          const data = (await response.json()) as {
            error?: string;
            detail?: string;
          };
          if (data.detail) {
            message = `${data.error ?? "Failed to create template"}: ${data.detail}`;
          } else if (data.error) {
            message = data.error;
          }
        } catch {
          // Non-JSON response fallback.
        }

        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      form.reset();
      setCreateTemplateError(null);
      setYamlSyntaxError(null);
      setShowCreateCategory(false);
      setCreateCategoryError(null);
    },
    onError: (err) =>
      setCreateTemplateError(
        err instanceof Error ? err.message : "Failed to create template",
      ),
  });

  const handleYamlInput = (val: string) => {
    form.setValue("yamlContent", val);
    if (!val.trim()) {
      setYamlSyntaxError(null);
      return;
    }
    try {
      yaml.load(val);
      setYamlSyntaxError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid YAML syntax";
      setYamlSyntaxError(`Syntax Error: ${message}`);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (yamlSyntaxError) return;
    setCreateTemplateError(null);
    try {
      await createTemplateMutation.mutateAsync({
        title: values.title,
        description: values.description || null,
        categoryName: values.categorySelection,
        yaml: values.yamlContent,
      });
    } catch {
      // Error is handled in mutation onError and shown in UI.
    }
  }

  const handleCreateCategory = async () => {
    const raw = form.getValues("newCategoryName");
    const trimmed = raw?.trim();
    if (!trimmed) {
      setCreateCategoryError("Category name cannot be empty.");
      return;
    }
    await createCategoryMutation.mutateAsync(trimmed);
  };

  const yamlDraft = form.watch("yamlContent");

  const draftLineCount = getYamlLineCount(yamlDraft);
  const draftComplexity = yamlDraft.trim()
    ? getComplexityBand(draftLineCount)
    : "-";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200 bg-slate-50/70 lg:sticky lg:top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCode2 className="h-5 w-5 text-blue-600" />
                  Template Metadata
                </CardTitle>
                <CardDescription>
                  Define marketplace metadata before publishing.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 ">
                <div className="space-y-1">
                  <div className="relative">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                            Title
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Next.js Enterprise Starter"
                              className="pl-2 bg-white border-slate-200 shadow-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="  text-sm text-rose-600" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none pl-2 bg-white border-slate-200 shadow-sm"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="  text-sm text-rose-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categorySelection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                        Category
                      </FormLabel>
                      <FormControl>
                        <select
                          className="bg-white w-full h-10 text-sm pl-2 shadow-sm rounded-md border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <option value="">Select category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-sm text-rose-600" />
                    </FormItem>
                  )}
                />

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-750">
                    Category Management
                  </span>
                  <div className="rounded-md border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Manage Categories
                        </p>
                        <p className="text-xs text-slate-750 mt-1">
                          Reuse an existing category or create a new one for
                          this blueprint.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => {
                          setShowCreateCategory((prev) => !prev);
                          setCreateCategoryError(null);
                          form.setValue("newCategoryName", "");
                        }}
                      >
                        {showCreateCategory
                          ? "Close Creator"
                          : "Create Category"}
                      </Button>
                    </div>

                    {showCreateCategory && (
                      <div className="space-y-3 rounded-md border border-dashed border-blue-200 bg-blue-50/40 p-3">
                        <FormField
                          control={form.control}
                          name="newCategoryName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Platform APIs"
                                  className="bg-white border-slate-200 shadow-sm"
                                  {...field}
                                  onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                  ) => {
                                    field.onChange(e);
                                    setCreateCategoryError(null);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {createCategoryError && (
                          <p className="text-xs text-rose-600">
                            {createCategoryError}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleCreateCategory}
                            disabled={createCategoryMutation.isPending}
                          >
                            {createCategoryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Add Category
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="border border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200"
                            onClick={() => {
                              setShowCreateCategory(false);
                              setCreateCategoryError(null);
                              form.setValue("newCategoryName", "");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl  bg-white  space-y-4  ">
                  <div className="flex items-start justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-15 w-full text-md border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 gap-1.5"
                      onClick={() => setWizardOpen(true)}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Use Template Wizard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            {/* Template Wizard Dialog */}
            <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
              <DialogContent className="w-[96vw] !max-w-lg max-h-[90vh] overflow-y-auto p-0 bg-white">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <DialogTitle className="text-base font-semibold text-slate-900">
                          Template Wizard
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-750">
                          Select a framework and configure options to
                          auto-generate YAML.
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
                <div className="px-6 py-5">
                  <TemplateWizard
                    onGenerate={(yamlString) => {
                      handleYamlInput(yamlString);
                      setWizardOpen(false);
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Card
              className={`border-2 h-full flex flex-col ${yamlSyntaxError ? "border-rose-400" : "border-slate-200"}`}
            >
              <CardHeader className=" flex flex-row items-center justify-between py-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-5 w-5 text-slate-750" />
                  <CardTitle className="text-base">Blueprint Editor</CardTitle>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700"
                  >
                    {draftLineCount} lines
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-700"
                  >
                    {draftComplexity === "-"
                      ? "Complexity -"
                      : `Complexity ${draftComplexity.toLowerCase()}`}
                  </Badge>
                  {yamlSyntaxError ? (
                    <Badge
                      variant="destructive"
                      className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" /> Syntax Error
                    </Badge>
                  ) : yamlDraft ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Valid YAML
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 relative flex flex-col">
                <FormField
                  control={form.control}
                  name="yamlContent"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col m-0">
                      <FormControl>
                        <Textarea
                          placeholder="apiVersion: scaffolder.devcentral.io/v1alpha1&#10;kind: Template&#10;metadata:&#10;  name: my-blueprint&#10;spec: ..."
                          className="flex-1 min-h-[500px] border-0 rounded-none font-mono text-sm bg-slate-100 text-slate-800 focus-visible:ring-0 p-6"
                          onChange={(e) => handleYamlInput(e.target.value)}
                          value={field.value}
                        />
                      </FormControl>

                      <FormMessage
                        className=" pl-4 text-md text-rose-600 font-mono
                      "
                      />
                    </FormItem>
                  )}
                />

                {yamlSyntaxError && (
                  <div className="bg-rose-50 border-t-2 border-rose-500 text-rose-900 p-4 font-mono text-sm max-h-[150px] overflow-auto">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <pre className="whitespace-pre-wrap">
                        {yamlSyntaxError}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

              <CardFooter className="   px-4 flex justify-between items-center gap-3">
                <p className="text-xs text-slate-650 hidden sm:block">
                  Real-time YAML validation via js-yaml.
                </p>
                {createTemplateError && (
                  <p className="text-xs text-rose-600 sm:mr-2 max-w-md text-right">
                    {createTemplateError}
                  </p>
                )}
                <Button
                  type="submit"
                  size="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white ml-auto gap-2"
                  disabled={
                    createTemplateMutation.isPending || !!yamlSyntaxError
                  }
                >
                  {createTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Publish Blueprint
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
