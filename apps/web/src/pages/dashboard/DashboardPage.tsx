import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  Zap,
  PlayCircle,
  AlertTriangle,
  Columns3Cog,
  Pencil,
  RefreshCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table.js";

import { METRICS, RECENT_PIPELINES, AI_ALERTS } from "./DashboardMockData.js";

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here is the status of your ecosystem.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline">
            <Columns3Cog className="mr-2 h-4 w-4" /> Customise Dashboard
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.icon}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.trend} from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): CI/CD & PRs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CI/CD Pipelines Card */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Recent Pipelines</CardTitle>
              <CardDescription>
                Status of your continuous integration workflows across all
                repos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_PIPELINES.map((pipeline) => (
                    <TableRow key={pipeline.id}>
                      <TableCell className="font-medium">
                        {pipeline.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{pipeline.repo}</span>
                          <span className="text-xs text-muted-foreground">
                            branch: {pipeline.branch}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pipeline.status === "success" && (
                          <Badge
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Success
                          </Badge>
                        )}
                        {pipeline.status === "running" && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            Running...
                          </Badge>
                        )}
                        {pipeline.status === "failed" && (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {pipeline.duration}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Repository Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>My Repository Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start">
              <GitPullRequest className="mr-2 h-4 w-4" /> Review 3 pending PRs
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" /> Resolve 2 SonarQube
              bugs
              <Pencil className="ml-auto h-4 w-4" />
            </Button>

            <Button variant="outline" className="justify-start">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve release to
              Production
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-start">
              <GitPullRequest className="mr-2 h-4 w-4" /> Review 3 pending PRs
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" /> Resolve 2 SonarQube
              bugs
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-start">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve release to
              Production
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" /> Resolve 2 SonarQube
              bugs
              <Pencil className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Right Column (Span 1): Tasks & AI Insights */}
        <div className="flex flex-col gap-6">
          {/* AI Insights Card */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700 dark:text-purple-400">
                <Zap className="mr-2 h-4 w-4" /> AI Platform Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {AI_ALERTS.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-sm p-3 bg-background rounded-lg border"
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 ${alert.level === "high" ? "text-red-500" : "text-yellow-500"}`}
                  />
                  <div>
                    <p className="font-medium leading-none mb-1">
                      {alert.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {alert.time}
                    </span>
                  </div>
                </div>
              ))}
              <Button
                variant="link"
                className="text-purple-600 h-auto p-0 mt-2"
              >
                View all insights &rarr;
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
