import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Automatically restore all vi.spyOn + vi.stubGlobal after each test
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      enabled: true,
      provider: "v8",
      // Keep coverage visible in Vitest UI even when some tests fail.
      reportOnFailure: true,
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.test.tsx", // Exclude the tests themselves from coverage
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
