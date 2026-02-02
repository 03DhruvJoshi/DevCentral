import { Server, Github } from "lucide-react";

// --- Mock Integration Data ---

export const INTEGRATIONS = [
  {
    name: "GitHub",
    status: "Healthy",
    icon: Github,
    color: "text-slate-900 dark:text-white",
  },
  {
    name: "Azure DevOps",
    status: "Healthy",
    icon: Server,
    color: "text-blue-600",
  },
];

// --- Mock Pipeline Data ---
export const PIPELINES = [
  {
    id: "pipe-4821",
    name: "auth-service-cd",
    env: "Production",
    stage: "Deploying",
    progress: 75,
    status: "running",
    time: "2m ago",
  },
  {
    id: "pipe-4820",
    name: "billing-api-ci",
    env: "Staging",
    stage: "Completed",
    progress: 100,
    status: "success",
    time: "1h ago",
  },
  {
    id: "pipe-4819",
    name: "web-client-ci",
    env: "Development",
    stage: "Failed at Unit Tests",
    progress: 30,
    status: "failed",
    time: "3h ago",
  },
];

// --- Mock PR Data ---
export const PULL_REQUESTS = [
  {
    id: "#142",
    title: "feat: implement oauth2 login",
    repo: "auth-service",
    prIssue: "Issue #46",
    author: "Alex",
    status: "Open",
    checks: "3/4 passing",
  },
  {
    id: "#141",
    title: "fix: memory leak in worker",
    repo: "billing-api",
    prIssue: "Issue #45",
    author: "Sam",
    status: "Merged",
    checks: "All passed",
  },
  {
    id: "#140",
    title: "chore: update vite config",
    repo: "web-client",
    prIssue: "Issue #44",
    author: "Jordan",
    status: "Open",
    checks: "Running...",
  },
];

// --- Mock Security Data (SonarQube/Dependabot) ---
export const SECURITY_ALERTS = [
  {
    severity: "Critical",
    package: "lodash",
    version: "<4.17.21",
    issue: "Prototype Pollution",
    source: "GitHub Dependabot",
  },
  {
    severity: "High",
    package: "auth-controller.ts",
    version: "Line 42",
    issue: "Hardcoded Secret Token",
    source: "SonarQube",
  },
  {
    severity: "Medium",
    package: "express",
    version: "<4.18.0",
    issue: "Denial of Service (DoS)",
    source: "Azure Advanced Security",
  },
];
