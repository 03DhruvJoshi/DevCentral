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

  it("generates react-vite output with package.json", () => {
    const result = generateYaml("react-vite", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("includes tsconfig.json for react-vite with typescript option", () => {
    const result = generateYaml("react-vite", ["typescript"]);
    expect(result).toContain("tsconfig.json");
  });

  it("generates vue-nuxt output with nuxt.config", () => {
    const result = generateYaml("vue-nuxt", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("nuxt.config");
  });

  it("generates sveltekit output", () => {
    const result = generateYaml("sveltekit", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("generates laravel output with docker-compose.yml", () => {
    const result = generateYaml("laravel", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("docker-compose.yml");
  });

  it("generates django output with requirements.txt", () => {
    const result = generateYaml("django", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("requirements.txt");
  });

  it("generates rails output", () => {
    const result = generateYaml("rails", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("Gemfile");
  });

  it("generates expo output with package.json", () => {
    const result = generateYaml("expo", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("generates flutter output with pubspec.yaml", () => {
    const result = generateYaml("flutter", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("pubspec.yaml");
  });

  it("generates swift-ios output", () => {
    const result = generateYaml("swift-ios", []);
    expect(result).toMatch(/^files:/);
  });

  it("generates kotlin-android output", () => {
    const result = generateYaml("kotlin-android", []);
    expect(result).toMatch(/^files:/);
  });

  it("generates express output with package.json", () => {
    const result = generateYaml("express", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("generates nestjs output with package.json", () => {
    const result = generateYaml("nestjs", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("package.json");
  });

  it("generates fastapi output with requirements.txt", () => {
    const result = generateYaml("fastapi", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("requirements.txt");
  });

  it("generates go-gin output with go.mod", () => {
    const result = generateYaml("go-gin", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("go.mod");
  });

  it("generates spring-boot output", () => {
    const result = generateYaml("spring-boot", []);
    expect(result).toMatch(/^files:/);
  });

  it("generates pytorch output with requirements.txt", () => {
    const result = generateYaml("pytorch", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("requirements.txt");
  });

  it("generates langchain output with requirements.txt", () => {
    const result = generateYaml("langchain", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("requirements.txt");
  });

  it("generates data-pipeline output with pipeline.py", () => {
    const result = generateYaml("data-pipeline", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("pipeline.py");
  });

  it("generates jupyter output with requirements.txt", () => {
    const result = generateYaml("jupyter", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("requirements.txt");
  });

  it("generates kubernetes output with k8s manifests", () => {
    const result = generateYaml("kubernetes", []);
    expect(result).toMatch(/^files:/);
    expect(result).toContain("k8s/deployment.yaml");
    expect(result).toContain("k8s/service.yaml");
  });
});

describe("generateYaml — option combinations", () => {
  it("includes tailwind CSS file for nextjs with tailwind option", () => {
    const result = generateYaml("nextjs", ["tailwind"]);
    expect(result).toContain("tailwind.config");
    expect(result).toContain("globals.css");
  });

  it("includes prisma schema for nextjs with prisma option", () => {
    const result = generateYaml("nextjs", ["prisma"]);
    expect(result).toContain("prisma/schema.prisma");
  });

  it("includes auth route for nextjs with auth option", () => {
    const result = generateYaml("nextjs", ["auth"]);
    expect(result).toContain("nextauth");
  });

  it("includes Dockerfile for nextjs with docker option", () => {
    const result = generateYaml("nextjs", ["docker"]);
    expect(result).toContain("Dockerfile");
  });

  it("includes CI workflow for nextjs with ci option", () => {
    const result = generateYaml("nextjs", ["ci"]);
    expect(result).toContain(".github/workflows/ci.yml");
  });

  it("includes postgres service for docker-compose with postgres option", () => {
    const result = generateYaml("docker-compose", ["postgres"]);
    expect(result).toContain("postgres");
  });

  it("includes redis service for docker-compose with redis option", () => {
    const result = generateYaml("docker-compose", ["redis"]);
    expect(result).toContain("redis");
  });

  it("includes terraform CI workflow for terraform-aws with ci option", () => {
    const result = generateYaml("terraform-aws", ["ci"]);
    expect(result).toContain("terraform.yml");
  });

  it("includes ingress manifest for kubernetes with ingress option", () => {
    const result = generateYaml("kubernetes", ["ingress"]);
    expect(result).toContain("k8s/ingress.yaml");
  });

  it("includes HPA manifest for kubernetes with hpa option", () => {
    const result = generateYaml("kubernetes", ["hpa"]);
    expect(result).toContain("k8s/hpa.yaml");
  });

  it("includes streamlit app for langchain with streamlit option", () => {
    const result = generateYaml("langchain", ["streamlit"]);
    expect(result).toContain("app.py");
  });

  it("includes Dockerfile for data-pipeline with docker option", () => {
    const result = generateYaml("data-pipeline", ["docker"]);
    expect(result).toContain("Dockerfile");
  });

  it("includes CI for data-pipeline with ci option", () => {
    const result = generateYaml("data-pipeline", ["ci"]);
    expect(result).toContain(".github/workflows/ci.yml");
  });

  it("includes Dockerfile for jupyter with docker option", () => {
    const result = generateYaml("jupyter", ["docker"]);
    expect(result).toContain("Dockerfile");
  });

  it("includes kubernetes CI workflow with ci option", () => {
    const result = generateYaml("kubernetes", ["ci"]);
    expect(result).toContain("deploy.yml");
  });
});
