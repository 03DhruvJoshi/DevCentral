import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    // API package uses Jest; avoid loading those tests in Vitest.
    exclude: [
      ...configDefaults.exclude,
      "apps/api/**/*.test.ts",
      "apps/api/**/*.test.tsx",
    ],
  },
});
