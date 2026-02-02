// --- Mock Analytics Data ---

// 1. Velocity / Deployment Frequency (Per Week)
export const DEPLOYMENT_DATA = [
  { name: "Week 1", deployments: 12 },
  { name: "Week 2", deployments: 19 },
  { name: "Week 3", deployments: 15 },
  { name: "Week 4", deployments: 22 },
  { name: "Week 5", deployments: 28 },
  { name: "Week 6", deployments: 31 },
];

// 2. PR Cycle Time (Hours from Open to Merge)
export const CYCLE_TIME_DATA = [
  { name: "Week 1", hours: 42 },
  { name: "Week 2", hours: 38 },
  { name: "Week 3", hours: 35 },
  { name: "Week 4", hours: 28 },
  { name: "Week 5", hours: 22 },
  { name: "Week 6", hours: 18 }, // Trend going down is good!
];

// 3. Code Churn (Additions vs Deletions in Lines of Code)
export const CHURN_DATA = [
  { name: "Week 1", additions: 4000, deletions: 2400 },
  { name: "Week 2", additions: 3000, deletions: 1398 },
  { name: "Week 3", additions: 2000, deletions: 9800 }, // Big refactor week
  { name: "Week 4", additions: 2780, deletions: 3908 },
  { name: "Week 5", additions: 1890, deletions: 4800 },
  { name: "Week 6", additions: 2390, deletions: 3800 },
];

// 4. Build Success Rate
export const SUCCESS_DATA = [
  { name: "Success", value: 85 },
  { name: "Failed", value: 15 },
];

export const SUCCESS_COLORS = ["#16a34a", "#dc2626"]; // Tailwind green-600 and red-600
