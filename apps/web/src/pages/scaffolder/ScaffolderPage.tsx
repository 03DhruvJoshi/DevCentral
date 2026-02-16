// apps/web/src/features/scaffolder/ScaffolderPage.tsx

import { useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import {
  Box,
  Trash2,
  Loader2,
  PlusCircle,
  Search,
  TerminalSquare,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { Textarea } from "../../components/ui/textarea.js";
import { Separator } from "../../components/ui/separator.js";
import { formSchema } from "../../zod/ScaffolderZod.js";

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? "http://localhost:4000";

// API Template type (matches Express backend response)
interface Template {
  id: number;
  title: string;
  description: string;
  categoryName: string;
  yaml: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
}

const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${API_BASE_URL}/api/categories`);
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
};

// Fetch templates from API
const fetchTemplates = async (): Promise<Template[]> => {
  const response = await fetch(`${API_BASE_URL}/api/templates`);
  if (!response.ok) {
    throw new Error("Failed to fetch templates");
  }
  return response.json();
};

// --- Main Component ---
export function ScaffolderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,

    isError: isErrorCategories,
    error: errorCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string): Promise<Category> => {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        let detail = "Failed to create category";
        try {
          const json = (await response.json()) as { error?: string };
          detail = json?.error ?? detail;
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      return response.json();
    },
    onSuccess: async (newCategory) => {
      setCreateCategoryError(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      form.setValue("categorySelection", newCategory.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue("newCategoryName", "", {
        shouldDirty: false,
        shouldValidate: false,
      });
      setShowCreateCategory(false);
    },
    onError: (err) => {
      setCreateCategoryError(err instanceof Error ? err.message : String(err));
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      categoryName: string;
      yaml: string;
    }): Promise<Template> => {
      const response = await fetch(`${API_BASE_URL}/api/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = "Failed to create template";
        try {
          const json = (await response.json()) as { error?: string };
          detail = json?.error ?? detail;
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      form.reset();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number): Promise<void> => {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${templateId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to delete template");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  // --- Form Handling ---
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await createTemplateMutation.mutateAsync({
      title: values.title,
      description: values.description,
      categoryName: values.categorySelection,
      yaml: values.yamlContent,
    });
  }

  // --- Filtering for Marketplace View ---
  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get unique categories from fetched templates + predefined ones
  const allCategories = [
    ...new Set([
      ...categories.map((c) => c.name),
      ...templates.map((t) => t.categoryName),
    ]),
  ];

  // Group templates by category for display
  const groupedTemplates = allCategories.reduce(
    (acc, category) => {
      acc[category] = filteredTemplates.filter(
        (t) => t.categoryName === category,
      );
      return acc;
    },
    {} as Record<string, Template[]>,
  );

  const deleteTemplate = async (templateId: number) => {
    await deleteTemplateMutation.mutateAsync(templateId);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Template Scaffolder
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate standardised project boilerplates or contribute new templates
          to the organisation.
        </p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="browse">Browse Marketplace</TabsTrigger>
          <TabsTrigger value="create">Create Your Own Template</TabsTrigger>
        </TabsList>

        {/* ================== TAB 1: BROWSE MARKETPLACE ================== */}
        <TabsContent value="browse" className="mt-6">
          <div className="flex items-center w-full max-w-sm space-x-2 mb-6">
            <Input
              type="search"
              placeholder="Search templates or categories..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
            />
            <Button size="icon" variant="ghost">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading templates...
              </span>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="text-center py-12 text-destructive">
              Failed to load templates:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {/* Templates List */}
          {!isLoading && !isError && (
            <div className="space-y-8">
              {allCategories.map((category) => {
                const catTemplates = groupedTemplates[category] ?? [];
                if (catTemplates.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Box className="h-5 w-5 text-primary/80" />
                      {category}
                    </h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {catTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="flex flex-col h-full"
                        >
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {template.title}
                              </CardTitle>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-auto w-auto" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm bg-white">
                                  <DialogHeader>
                                    <DialogTitle>Delete Template</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this
                                      template? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button
                                        variant="outline"
                                        onClick={() => {}}
                                      >
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      type="submit"
                                      className="bg-black hover:bg-red-700 border-white-600 hover:border-red-700 text-white"
                                      onClick={async () => {
                                        await deleteTemplate(template.id);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <CardDescription className="line-clamp-2">
                              {template.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex-1">
                            <Badge variant="outline">
                              {template.categoryName}
                            </Badge>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <Button className="flex-1" size="sm">
                              <PlusCircle className="mr-2 h-4 w-4" /> Scaffold
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="secondary" size="sm">
                                  <TerminalSquare className="mr-2 h-4 w-4" />{" "}
                                  View YAML
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] bg-white overflow-hidden flex flex-col">
                                <DialogHeader>
                                  <DialogTitle>
                                    {template.title} - Blueprint
                                  </DialogTitle>
                                  <DialogDescription>
                                    This is the raw YAML definition used to
                                    generate this scaffold.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 overflow-auto bg-white p-4 rounded-md mt-2">
                                  <pre className="text-sm font-mono">
                                    <code>{template.yaml}</code>
                                  </pre>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {templates.length === 0
                    ? "No templates found. Create one to get started!"
                    : "Does not look like anything to me. Try a different search term."}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ================== TAB 2: CREATE/CONTRIBUTE ================== */}
        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contribute a New Template</CardTitle>
              <CardDescription>
                Define a new scaffolding blueprint using YAML and define its
                category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Template Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Python Flask Microservice"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What does this template scaffold?"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* --- Complex Category Selection --- */}
                      <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                        <FormField
                          control={form.control}
                          name="categorySelection"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel>Category Tagging</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl className="bg-white">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category pathway" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white">
                                  {isLoadingCategories && (
                                    <div className="px-2 py-1 text-sm text-muted-foreground">
                                      Loading categories...
                                    </div>
                                  )}
                                  {isErrorCategories && (
                                    <div className="px-2 py-1 text-sm text-destructive">
                                      Failed to load categories:{" "}
                                      {errorCategories instanceof Error
                                        ? errorCategories.message
                                        : "Unknown error"}
                                    </div>
                                  )}
                                  {!isLoadingCategories &&
                                    !isErrorCategories &&
                                    categories.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.name}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select an existing organizational category or
                                define a new one.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setCreateCategoryError(null);
                              setShowCreateCategory((v) => !v);
                            }}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Create new
                            category
                          </Button>
                          {createCategoryMutation.isPending && (
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating...
                            </span>
                          )}
                        </div>

                        {showCreateCategory && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <FormField
                              control={form.control}
                              name="newCategoryName"
                              render={({ field }: { field: any }) => (
                                <FormItem>
                                  <FormLabel className="text-primary">
                                    New Category Name
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g. Database Migrations"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {createCategoryError && (
                              <div className="text-sm text-destructive">
                                {createCategoryError}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={async () => {
                                  setCreateCategoryError(null);
                                  const name = (
                                    form.getValues("newCategoryName") ?? ""
                                  ).trim();
                                  if (name.length < 5) {
                                    setCreateCategoryError(
                                      "Category name must be at least 5 characters long.",
                                    );
                                    return;
                                  }
                                  await createCategoryMutation.mutateAsync(
                                    name,
                                  );
                                }}
                              >
                                Create Category
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setCreateCategoryError(null);
                                  setShowCreateCategory(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* YAML Editor Area */}
                    <FormField
                      control={form.control}
                      name="yamlContent"
                      render={({ field }: { field: any }) => (
                        <FormItem className="h-full flex flex-col">
                          <FormLabel>YAML Blueprint Definition</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="apiVersion: scaffolder.devcentral.io/v1alpha1..."
                              className="font-mono text-sm flex-1 min-h-[300px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Define parameters and steps using the scaffolder
                            schema.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Publish Template
                    </Button>
                  </div>

                  {createTemplateMutation.isError && (
                    <div className="text-sm text-destructive">
                      Failed to publish template:{" "}
                      {createTemplateMutation.error instanceof Error
                        ? createTemplateMutation.error.message
                        : "Unknown error"}
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
