// apps/web/src/features/scaffolder/ScaffolderPage.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Box,
  FileCode,
  PlusCircle,
  Search,
  TerminalSquare,
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import { CATEGORIES, MOCK_TEMPLATES } from "./MockTemplates";
import { type Template } from "./MockTemplates";
import { formSchema } from "../../zod/ScaffolderZod";

// --- Main Component ---
export function ScaffolderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createdCategoryOptions, setCreatedCategoryOptions] = useState<
    string[]
  >([]);

  // --- Form Handling ---
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      yamlContent: "",
      newCategoryName: "",
    },
  });

  // Watch the category selection to conditionally show the "New Category Name" input
  const selectedCategoryOption = form.watch("categorySelection");
  const isCreatingNew = selectedCategoryOption === "create_new_category";

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, this would POST to your Express backend endpoints: `/api/templates` and potentially `/api/categories`
    console.log("Form submitted:", values);
    const finalCategory = isCreatingNew
      ? values.newCategoryName
      : values.categorySelection;
    alert(`Simulating creation of template in category: ${finalCategory}`);

    // If created new, add to local state options for future use
    if (isCreatingNew && values.newCategoryName) {
      setCreatedCategoryOptions((prev) => [...prev, values.newCategoryName!]);
    }
    form.reset();
  }

  // --- Filtering for Marketplace View ---
  const filteredTemplates = MOCK_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Group templates by category for display
  const groupedTemplates = CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = filteredTemplates.filter((t) => t.category === category);
      return acc;
    },
    {} as Record<string, Template[]>,
  );

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button size="icon" variant="ghost">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-8">
            {CATEGORIES.map((category) => {
              const catTemplates = groupedTemplates[category];
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
                      <Card key={template.id} className="flex flex-col h-full">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {template.title}
                            </CardTitle>
                            <FileCode className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardDescription className="line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <Badge variant="outline">{template.category}</Badge>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                          <Button className="flex-1" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Scaffold
                          </Button>

                          {/* Dialog to Preview YAML */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="secondary" size="sm">
                                <TerminalSquare className="mr-2 h-4 w-4" /> View
                                YAML
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
                Does not look like anything to me. Try a different search term.
              </div>
            )}
          </div>
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
                        render={({ field }) => (
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
                        render={({ field }) => (
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
                          render={({ field }) => (
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
                                  {/* Existing standard categories */}
                                  {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                  {/* User created categories during this session */}
                                  {createdCategoryOptions.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                  <Separator className="my-2" />
                                  {/* Option to create new */}
                                  <SelectItem
                                    value="create_new_category"
                                    className="font-semibold text-primary"
                                  >
                                    <PlusCircle className="inline mr-2 h-4 w-4" />
                                    Create New Category...
                                  </SelectItem>
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

                        {/* Conditionally render Input if "create_new_category" is selected */}
                        {isCreatingNew && (
                          <FormField
                            control={form.control}
                            name="newCategoryName"
                            render={({ field }) => (
                              <FormItem className="animate-in fade-in slide-in-from-top-2">
                                <FormLabel className="text-primary">
                                  New Category Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g. Database Migrations"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* YAML Editor Area */}
                    <FormField
                      control={form.control}
                      name="yamlContent"
                      render={({ field }) => (
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
                    <Button type="submit" size="lg">
                      Publish Template
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
