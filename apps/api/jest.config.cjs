/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  /**
   * Strip the .js extension that TypeScript ESM source files emit so that
   * Jest's resolver can find the corresponding .ts source file.
   */
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "bundler",
          target: "ES2022",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["components/**/*.ts", "!**/*.test.ts"],
};
