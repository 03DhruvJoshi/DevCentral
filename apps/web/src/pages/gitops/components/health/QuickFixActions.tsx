import { useState } from "react";
import { Loader2, CheckCircle2, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";

import { Button } from "../../../../components/ui/button.js";
import {
  type Repository,
  type HealthCheckResult,
  API_BASE_URL,
  token,
} from "../types.js";

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
  isLoading?: boolean;
}) {
  const { selectedRepo, health, isLoading = false } = props;
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

  if (isLoading) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
              <Zap className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <span className="text-base">Quick Fixes</span>
              <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                One-click automated remediation for detected issues
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading available fixes...
        </CardContent>
      </Card>
    );
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
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
            <Zap className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <span className="text-base">Quick Fixes</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              One-click automated remediation for detected issues
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executed Actions */}
        {executedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm text-muted-foreground">Applied</h4>
            {executedActions.map((action) => {
              const result = results[action.type];
              return (
                <div
                  key={action.type}
                  className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800">
                        {action.label}
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {result.result?.message || "Fix applied successfully"}
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
            <h4 className="text-sm text-muted-foreground">
              Available Fixes ({availableActions.length})
            </h4>
            {availableActions.map((action) => (
              <div
                key={action.type}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-100 p-3 transition-colors hover:bg-slate-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-base flex-shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800">
                    {action.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 border-blue-300 text-xs text-blue-700 hover:bg-blue-100 hover:border-blue-400"
                    onClick={() => executeFixAction(action.type)}
                    disabled={executing === action.type}
                  >
                    {executing === action.type ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Applying…
                      </>
                    ) : (
                      <>
                        <Zap className="mr-1.5 h-3 w-3" />
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
          <div className="flex items-center gap-2 py-4 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="font-medium">
              No automated fixes required — all issues need manual review.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
