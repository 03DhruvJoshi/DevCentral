// This handles the complex logic of "Select existing OR type new category"
import * as z from "zod";

export const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." }),
  // The user selects an option from the dropdown
  categorySelection: z
    .string()
    .min(1, { message: "Please select a category option." }),
  // Used by the external "Create new category" UI
  newCategoryName: z.string().optional(),
  yamlContent: z
    .string()
    .min(20, { message: "YAML content is too short to be valid." }),
});
