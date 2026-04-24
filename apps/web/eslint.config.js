// eslint.config.js
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    rules: {
      semi: "error",
      "prefer-const": "error",
    },
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
  },
]);
