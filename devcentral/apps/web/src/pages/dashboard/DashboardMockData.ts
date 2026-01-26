import { GitPullRequest, Activity, CheckCircle2, Zap } from "lucide-react";

export const METRICS = [
  {
    title: "Build Success Rate",
    value: "94.2%",
    trend: "+2.1%",
    icon: CheckCircle2,
    text: "text-green-600",
  },
  {
    title: "Deployment Frequency",
    value: "14/day",
    trend: "+4",
    icon: Zap,
    text: "text-yellow-600",
  },
  {
    title: "Open Pull Requests",
    value: "12",
    trend: "-3",
    icon: GitPullRequest,
    text: "text-blue-600",
  },
  {
    title: "System Uptime",
    value: "99.98%",
    trend: "No active incidents",
    icon: Activity,
    text: "text-purple-600",
  },
];

export const RECENT_PIPELINES = [
  {
    id: "#4821",
    repo: "auth-service",
    branch: "main",
    status: "success",
    time: "2m ago",
    duration: "1m 42s",
  },
  {
    id: "#4820",
    repo: "billing-api",
    branch: "feat/stripe",
    status: "running",
    time: "5m ago",
    duration: "In progress",
  },
  {
    id: "#4819",
    repo: "web-client",
    branch: "fix/nav-bug",
    status: "failed",
    time: "15m ago",
    duration: "45s",
  },
];

export const AI_ALERTS = [
  {
    level: "high",
    message: "Memory leak detected in billing-api container (Node.js).",
    time: "1hr ago",
  },
  {
    level: "medium",
    message: "Outdated node:16 docker image used in auth-service.",
    time: "4hrs ago",
  },
];
