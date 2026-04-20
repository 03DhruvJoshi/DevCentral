import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    ignores: ["**/*.{test,spec}.{ts,tsx}", "jest.config.cjs"],
  },
];
