import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import type { Velocity, ReviewStat } from "../types.js";
import { TOOLTIP_STYLE } from "../utlities.js";

export default function ReviewTab({
  velocity,

  reviewLifecyclePrs,
}: {
  velocity: Velocity;

  reviewLifecyclePrs: ReviewStat[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">Review Response Buckets</CardTitle>
            <CardDescription>
              Time to first review grouped by response SLAs.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {velocity.review_response_buckets &&
            velocity.review_response_buckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={velocity.review_response_buckets}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar
                    dataKey="count"
                    name="PR Count"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Not enough data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">Lead Time Buckets</CardTitle>
            <CardDescription>
              Distribution of open-to-merge duration.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {velocity.lead_time_buckets &&
            velocity.lead_time_buckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={velocity.lead_time_buckets}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar
                    dataKey="count"
                    name="PR Count"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No lead-time distribution data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">PR Lifecycle by ID</CardTitle>
            <CardDescription>
              First review latency vs total merge time for recent merged PRs.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            {reviewLifecyclePrs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={reviewLifecyclePrs}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="number"
                    tickFormatter={(val) => `#${val}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip
                    labelFormatter={(label) => `PR #${label}`}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="time_to_first_review_h"
                    name="Time to Review (h)"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    type="monotone"
                    dataKey="time_to_merge_h"
                    name="Time to Merge (h)"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Not enough merged PRs for lifecycle analysis.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" /> Reviewer Impact
            </CardTitle>
            <CardDescription>
              Most active reviewers and approval contributors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Review Volume
              </p>
              {velocity.top_reviewers.length > 0 ? (
                <div className="space-y-2">
                  {velocity.top_reviewers.map((reviewer) => (
                    <div
                      key={`reviewer-${reviewer.username}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <span className="font-medium text-slate-800">
                        @{reviewer.username}
                      </span>
                      <Badge variant="secondary" className="font-mono">
                        {reviewer.count} reviews
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviewer data.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Approval Volume
              </p>
              {velocity.reviewer_approvals &&
              velocity.reviewer_approvals.length > 0 ? (
                <div className="space-y-2">
                  {velocity.reviewer_approvals.map((reviewer) => (
                    <div
                      key={`approval-${reviewer.username}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <span className="font-medium text-slate-800">
                        @{reviewer.username}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono border-emerald-200 text-emerald-700"
                      >
                        {reviewer.count} approvals
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No approval data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
