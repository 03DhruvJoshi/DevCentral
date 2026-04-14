import {
  AlertOctagon,
  Ghost,
  ExternalLink,
  Filter,
  GitBranch,
  ShieldAlert,
  Search,
} from "lucide-react";

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
} from "recharts";

import type { RiskLevel, Velocity } from "../types.js";
import { getRiskBadgeClass, TOOLTIP_STYLE } from "../utlities.js";

export default function DeepDiveTab({
  velocity,

  branchFilter,
  setBranchFilter,
  stateFilter,
  setStateFilter,
  riskFilter,
  setRiskFilter,
  search,
  setSearch,
  branchOptions,
}: {
  velocity: Velocity;

  branchFilter: string;
  setBranchFilter: (branch: string) => void;
  stateFilter: string;
  setStateFilter: (state: string) => void;
  riskFilter: "all" | RiskLevel;
  setRiskFilter: (risk: "all" | RiskLevel) => void;
  search: string;
  setSearch: (search: string) => void;
  branchOptions: any;
}) {
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <GitBranch className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none text-slate-700"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branchOptions.map((branch: any) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none text-slate-700"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="all">All States</option>
              <option value="open">Open</option>
              <option value="merged">Merged</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <ShieldAlert className="h-4 w-4 text-slate-500" />
            <select
              className="w-full bg-transparent text-sm outline-none text-slate-700"
              value={riskFilter}
              onChange={(e) =>
                setRiskFilter(e.target.value as "all" | RiskLevel)
              }
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PR #, title, author..."
              className="w-full bg-transparent text-sm outline-none text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Highest Risk PRs
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-slate-500">
              Ranked by size, commit churn, and review exposure.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {velocity.risk_prs && velocity.risk_prs.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {velocity.risk_prs.slice(0, 8).map((pr, i) => (
                  <div
                    key={pr.number}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {pr.title}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span>#{pr.number}</span>
                        <span>@{pr.author ?? "unknown"}</span>
                        <span>{pr.total_changes} changes</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getRiskBadgeClass(pr.risk_level)}`}
                      >
                        {pr.risk_level} risk ({pr.risk_score})
                      </Badge>
                    </div>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No elevated-risk PRs in this timeframe.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <AlertOctagon className="h-5 w-5" /> Merge Conflicts
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-slate-500">
              Open PRs blocked by unresolved merge conflicts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {velocity.merge_conflicts.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {velocity.merge_conflicts.map((pr, i) => (
                  <div
                    key={pr.number}
                    className="flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {pr.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        #{pr.number} • @{pr.author ?? "unknown"}
                      </p>
                    </div>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No merge conflicts found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md text-slate-900 flex items-center gap-2">
              <Ghost className="h-5 w-5" /> Stale Pull Requests
            </CardTitle>
            <CardDescription>
              Open PRs untouched for more than 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {velocity.stale_prs.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                {velocity.stale_prs.map((pr) => (
                  <div
                    key={`stale-${pr.number}`}
                    className="p-4 hover:bg-white transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-800 mb-1">
                        {pr.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          #{pr.number} • @{pr.author ?? "unknown"}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] py-0"
                        >
                          {pr.days_stale} days stale
                        </Badge>
                      </div>
                    </div>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-indigo-600 bg-slate-100 p-2 rounded-md transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No stale pull requests found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-slate-50 hover:bg-slate-100 transition-colors">
          <CardHeader>
            <CardTitle className="text-md">
              Open PR Pressure by Branch
            </CardTitle>
            <CardDescription>
              Branches accumulating unresolved PR load.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {velocity.active_branch_load &&
            velocity.active_branch_load.length > 0 ? (
              <ResponsiveContainer width="100%" height="120%">
                <BarChart
                  data={velocity.active_branch_load}
                  margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="branch"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar
                    dataKey="open_prs"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No open branch pressure data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
