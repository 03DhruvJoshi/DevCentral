import { buildNextjsYamlModular, buildReactViteYamlModular } from "./web.js";
import {
  buildExpressYamlModular,
  buildNestJsYamlModular,
  buildFastApiYamlModular,
  buildGoGinYamlModular,
  buildSpringBootYamlModular,
} from "./backend.js";

type Framework =
  | "nextjs"
  | "react-vite"
  | "express"
  | "nestjs"
  | "fastapi"
  | "go-gin"
  | "spring-boot";

export function generateYamlFromModules(
  framework: Framework,
  toggles: Set<string>,
): string | null {
  switch (framework) {
    case "nextjs":
      return buildNextjsYamlModular(toggles);
    case "react-vite":
      return buildReactViteYamlModular(toggles);
    case "express":
      return buildExpressYamlModular(toggles);
    case "nestjs":
      return buildNestJsYamlModular(toggles);
    case "fastapi":
      return buildFastApiYamlModular(toggles);
    case "go-gin":
      return buildGoGinYamlModular(toggles);
    case "spring-boot":
      return buildSpringBootYamlModular(toggles);
    default:
      return null;
  }
}
