// This handles the complex logic of "Select existing OR type new category"
import * as z from "zod";

export const formSchema = z
  .object({
    title: z
      .string()
      .min(5, { message: "Title must be at least 5 characters." }),
    description: z
      .string()
      .min(10, { message: "Description must be at least 10 characters." }),
    // The user selects an option from the dropdown
    categorySelection: z.string({
      required_error: "Please select a category option.",
    }),
    // If they chose "new", this field is required. Otherwise it's optional.
    newCategoryName: z.string().optional(),
    yamlContent: z
      .string()
      .min(20, { message: "YAML content is too short to be valid." }),
  })
  .refine(
    (data) => {
      // Custom validation rule: If selection is "new", newCategoryName must exist
      if (data.categorySelection === "create_new_category") {
        return !!data.newCategoryName && data.newCategoryName.length > 3;
      }
      return true;
    },
    {
      message: "New category name is required and must be > 3 chars.",
      path: ["newCategoryName"],
    },
  );
