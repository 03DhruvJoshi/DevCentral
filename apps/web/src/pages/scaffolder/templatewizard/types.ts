// TemplateWizardProps — the only contract this module still owns.
// All catalog types (WizardCatalogCategory, WizardFramework, WizardOption)
// now live in ../components/types.ts and are fetched from the API.

type Framework =
  | "nextjs"
  | "react-vite"
  | "vue-nuxt"
  | "sveltekit"
  | "laravel"
  | "django"
  | "rails"
  | "expo"
  | "flutter"
  | "swift-ios"
  | "kotlin-android"
  | "express"
  | "nestjs"
  | "fastapi"
  | "go-gin"
  | "spring-boot"
  | "pytorch"
  | "langchain"
  | "data-pipeline"
  | "jupyter"
  | "docker-compose"
  | "github-actions"
  | "terraform-aws"
  | "kubernetes";

interface TemplateWizardProps {
  onGenerate: (yamlString: string) => void;
}

export type { Framework, TemplateWizardProps };
