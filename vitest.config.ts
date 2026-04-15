import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["apps/api/**/*.test.{ts,tsx}"],
    // API package uses Jest; avoid loading those tests in Vitest.
    exclude: [...configDefaults.exclude, "apps/api/**/jest.config.cjs"],
  },
});
