import { Pencil } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Label } from "../../../components/ui/label.js";

import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [yamlContent, setYamlContent] = useState(template.yaml); // or template.yamlContent based on your type
  const [error, setError] = useState<string | null>(null);

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

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Failed to update template");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Instantly refresh the UI with the new data!
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setIsOpen(false);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex-1">
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl sm:max-w-2xl overflow-y-auto p-4 sm:p-6 bg-white">
        <DialogHeader>
          <DialogTitle>Edit Template: {template.title}</DialogTitle>
          <DialogDescription>
            Modify the details and YAML blueprint below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4 py-4">
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryName} onValueChange={setCategoryName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <Label>YAML Blueprint</Label>
            <Textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              required
              className="font-mono text-sm min-h-[300px]"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditTemplateModal;
