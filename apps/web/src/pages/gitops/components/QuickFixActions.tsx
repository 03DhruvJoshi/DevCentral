import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import {
  type Repository,
  type HealthCheckResult,
  API_BASE_URL,
  token,
} from "./types.js";

interface FixActionItem {
  type: string;
  label: string;
  description: string;
  icon: string;
}

const QUICK_FIX_ACTIONS: FixActionItem[] = [
  {
    type: "enable-branch-protection",
    label: "Enable Branch Protection",
    description: "Protect main branch: require reviews, enforce status checks",
    icon: "🔒",
  },
  {
    type: "add-codeowners",
    label: "Add CODEOWNERS",
    description:
      "Create CODEOWNERS file to define code review responsibilities",
    icon: "👥",
  },
  {
    type: "enable-dependabot",
    label: "Enable Dependabot",
    description: "Automatically track and update dependencies",
    icon: "📦",
  },
  {
    type: "enforce-status-checks",
    label: "Enforce Status Checks",
    description: "Require CI/CD pipeline to pass before merging",
    icon: "✅",
  },
];

export default function QuickFixActions(props: {
  selectedRepo: Repository;
  health: HealthCheckResult | null;
}) {
  const { selectedRepo, health } = props;
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  async function executeFixAction(actionType: string) {
    setExecuting(actionType);
    try {
      const url = `${API_BASE_URL}/api/gitops/repos/${selectedRepo.owner}/${selectedRepo.name}/fix/${actionType}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to execute fix");
      const result = await res.json();

      setResults((prev) => ({
        ...prev,
        [actionType]: result,
      }));
    } catch (err) {
      console.error("Fix action error:", err);
      setResults((prev) => ({
        ...prev,
        [actionType]: { success: false, error: String(err) },
      }));
    } finally {
      setExecuting(null);
    }
  }

  if (!health) {
    return null;
  }

  // Get issues that can be auto-fixed
  const fixableIssues = [
    ...health.securityIssues,
    ...health.codeQualityIssues,
    ...health.deploymentReadinessIssues,
    ...health.teamOwnershipIssues,
  ].filter((i) => i.autofixable);

  // Filter actions based on detected issues
  const availableActions = QUICK_FIX_ACTIONS.filter(
    (action) =>
      fixableIssues.some((issue) => issue.fixAction === action.type) &&
      !results[action.type],
  );

  const executedActions = QUICK_FIX_ACTIONS.filter(
    (action) => results[action.type],
  );

  if (availableActions.length === 0 && executedActions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          Quick Fixes
        </CardTitle>
        <CardDescription>
          One-click actions to resolve detected issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executed Actions */}
        {executedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Completed
            </h4>
            {executedActions.map((action) => {
              const result = results[action.type];
              return (
                <div
                  key={action.type}
                  className="p-3 rounded-lg border bg-green-50 border-green-200"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {action.label}
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        {result.result?.message ||
                          "✅ Fix applied successfully"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Actions */}
        {availableActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Available Fixes
            </h4>
            {availableActions.map((action) => (
              <div
                key={action.type}
                className="p-3 rounded-lg border bg-blue-50 border-blue-200 flex items-start gap-3"
              >
                <div className="text-xl flex-shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{action.label}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => executeFixAction(action.type)}
                    disabled={executing === action.type}
                  >
                    {executing === action.type ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-3 w-3" />
                        Apply Fix
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableActions.length === 0 && executedActions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-600" />
            <p className="text-sm">
              All issues are either resolved or require manual intervention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
