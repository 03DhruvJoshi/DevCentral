/**
 * Tests for wizardgenerator.ts — Pure YAML generation logic
 * Function covered:
 *   generateYaml(frameworkId, optionIds) → string
 *
 * No HTTP layer or mocking needed — this is a pure deterministic function.
 */
import { describe, it, expect } from "@jest/globals";
import { generateYaml } from "./wizardgenerator";

// ── Test suites ───────────────────────────────────────────────────────────────

describe("generateYaml — known frameworks", () => {
  it("returns a valid YAML string containing a files block for the 'nextjs' framework", () => {
    const result = generateYaml("nextjs", []);

    expect(typeof result).toBe("string");
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("includes TypeScript-specific files when the 'typescript' option is requested", () => {
    const withTs = generateYaml("nextjs", ["typescript"]);
    const withoutTs = generateYaml("nextjs", []);

    expect(withTs).toContain("tsconfig.json");
    // Without the flag the tsconfig should not be present
    expect(withoutTs).not.toContain("tsconfig.json");
  });

  it("generates a docker-compose.yml entry when the 'docker-compose' framework is selected", () => {
    const result = generateYaml("docker-compose", []);

    expect(result).toContain("docker-compose.yml");
    expect(result).toContain("Dockerfile");
  });

  it("includes CI workflow files for the 'github-actions' framework", () => {
    const result = generateYaml("github-actions", []);

    expect(result).toContain(".github/workflows/ci.yml");
    expect(result).toContain(".github/workflows/cd.yml");
  });

  it("includes Terraform AWS files for the 'terraform-aws' framework", () => {
    const result = generateYaml("terraform-aws", []);

    expect(result).toContain("main.tf");
    expect(result).toContain("variables.tf");
  });

  it("falls back to a stub README entry for an unknown frameworkId", () => {
    const result = generateYaml("totally-unknown-framework", []);

    expect(result).toMatch(/^files:/);
    expect(result).toContain("README.md");
    expect(result).toContain("not yet supported");
  });
});
