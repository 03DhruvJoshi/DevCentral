import {
  GitPullRequest,
  Activity,
  CheckCircle2,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Sparkline data for mini charts in metric cards
export const METRICS: {
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  sparklineData: number[];
  description: string;
}[] = [
  {
    title: "Build Success Rate",
    value: "94.2%",
    trend: "+2.1%",
    trendDirection: "up",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    sparklineData: [88, 90, 87, 92, 89, 94, 94.2],
    description: "Last 7 days",
  },
  {
    title: "Deployment Frequency",
    value: "14/day",
    trend: "+4 deploys",
    trendDirection: "up",
    icon: Zap,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    sparklineData: [8, 10, 9, 12, 11, 13, 14],
    description: "vs. last week",
  },
  {
    title: "Open Pull Requests",
    value: "12",
    trend: "-3 PRs",
    trendDirection: "down",
    icon: GitPullRequest,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    sparklineData: [18, 15, 17, 14, 16, 13, 12],
    description: "Decreasing backlog",
  },
  {
    title: "System Uptime",
    value: "99.98%",
    trend: "No incidents",
    trendDirection: "neutral",
    icon: Activity,
    iconColor: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    sparklineData: [99.9, 99.95, 99.98, 99.97, 99.99, 99.98, 99.98],
    description: "Last 30 days",
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
    commit: "feat: add OAuth2 support",
    author: "Sarah Chen",
    avatar: "SC",
  },
  {
    id: "#4820",
    repo: "billing-api",
    branch: "feat/stripe",
    status: "running",
    time: "5m ago",
    duration: "In progress",
    commit: "refactor: payment handlers",
    author: "Mike Johnson",
    avatar: "MJ",
    progress: 67,
  },
  {
    id: "#4819",
    repo: "web-client",
    branch: "fix/nav-bug",
    status: "failed",
    time: "15m ago",
    duration: "45s",
    commit: "fix: navigation state",
    author: "Alex Rivera",
    avatar: "AR",
    errorMessage: "Test suite failed: 2 assertions",
  },
  {
    id: "#4818",
    repo: "data-pipeline",
    branch: "main",
    status: "success",
    time: "1h ago",
    duration: "3m 12s",
    commit: "chore: update dependencies",
    author: "Jordan Lee",
    avatar: "JL",
  },
  {
    id: "#4817",
    repo: "notification-svc",
    branch: "feat/websockets",
    status: "success",
    time: "2h ago",
    duration: "2m 08s",
    commit: "feat: real-time notifications",
    author: "Emma Wilson",
    avatar: "EW",
  },
];

export const AI_ALERTS = [
  {
    level: "high",
    message: "Memory leak detected in billing-api container (Node.js).",
    time: "1hr ago",
    actionLabel: "View Details",
    suggestion:
      "Consider increasing container memory limits or investigating the leak source.",
  },
  {
    level: "medium",
    message: "Outdated node:16 docker image used in auth-service.",
    time: "4hrs ago",
    actionLabel: "Update Image",
    suggestion:
      "Upgrade to node:20-alpine for security patches and performance.",
  },
  {
    level: "low",
    message: "Unused environment variables detected in 3 services.",
    time: "1d ago",
    actionLabel: "Clean Up",
    suggestion: "Remove unused variables to improve configuration clarity.",
  },
];

export const QUICK_ACTIONS = [
  {
    label: "Review 3 pending PRs",
    icon: "pr",
    count: 3,
    urgency: "medium",
    href: "/gitops",
  },
  {
    label: "Resolve SonarQube bugs",
    icon: "bug",
    count: 2,
    urgency: "high",
    href: "/analytics",
  },
  {
    label: "Approve release to Production",
    icon: "deploy",
    count: 1,
    urgency: "low",
    href: "/gitops",
  },
];

export const RECENT_ACTIVITY = [
  {
    id: 1,
    user: "Sarah Chen",
    avatar: "SC",
    action: "merged PR",
    target: "#421 into main",
    repo: "auth-service",
    time: "5 minutes ago",
    type: "merge",
  },
  {
    id: 2,
    user: "Mike Johnson",
    avatar: "MJ",
    action: "deployed",
    target: "v2.4.1",
    repo: "billing-api",
    time: "12 minutes ago",
    type: "deploy",
  },
  {
    id: 3,
    user: "Alex Rivera",
    avatar: "AR",
    action: "opened issue",
    target: "Performance regression",
    repo: "web-client",
    time: "1 hour ago",
    type: "issue",
  },
  {
    id: 4,
    user: "Jordan Lee",
    avatar: "JL",
    action: "commented on",
    target: "PR #418",
    repo: "data-pipeline",
    time: "2 hours ago",
    type: "comment",
  },
  {
    id: 5,
    user: "Emma Wilson",
    avatar: "EW",
    action: "created branch",
    target: "feat/notifications",
    repo: "notification-svc",
    time: "3 hours ago",
    type: "branch",
  },
];

export const SERVICE_HEALTH = [
  { name: "auth-service", status: "healthy", uptime: 99.99, latency: 45 },
  { name: "billing-api", status: "degraded", uptime: 98.5, latency: 230 },
  { name: "web-client", status: "healthy", uptime: 99.95, latency: 62 },
  { name: "data-pipeline", status: "healthy", uptime: 99.9, latency: 180 },
  { name: "notification-svc", status: "healthy", uptime: 99.97, latency: 38 },
];

// Weekly deployment trend data for area chart
export const WEEKLY_DEPLOYMENTS = [
  { day: "Mon", deployments: 8, failures: 1 },
  { day: "Tue", deployments: 12, failures: 0 },
  { day: "Wed", deployments: 15, failures: 2 },
  { day: "Thu", deployments: 10, failures: 1 },
  { day: "Fri", deployments: 18, failures: 0 },
  { day: "Sat", deployments: 4, failures: 0 },
  { day: "Sun", deployments: 2, failures: 0 },
];
