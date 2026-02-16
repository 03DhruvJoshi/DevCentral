import { useEffect, useState } from "react";
import {
  GitPullRequest,
  GitCommit,
  PlayCircle,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  GitBranch,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Progress } from "../../components/ui/progress";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  INTEGRATIONS,
  PIPELINES,
  PULL_REQUESTS,
  SECURITY_ALERTS,
} from "./GitOpsMockData";

interface Repository {
  id: number;
  name: string;
  url: string;
  private: boolean;
  language: string;
  updated_at: string;
}

export function GitOpsPage() {
  const [activeTab, setActiveTab] = useState("pipelines");
  const [repos, setRepos] = useState<Repository[]>([]);

  useEffect(() => {
    fetch("/api/gitops/repos")
      .then((res) => res.json())
      .then((data) => setRepos(data));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header & Integrations Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitOps & CI/CD</h1>
          <p className="text-muted-foreground mt-1">
            Control center for version control, automated pipelines, and release
            management.
          </p>
        </div>

        {/* Integration Status Badges */}
        <div className="flex gap-3">
          {INTEGRATIONS.map((int) => (
            <Badge
              key={int.name}
              variant="outline"
              className="flex items-center gap-1.5 py-1.5 px-3"
            >
              <int.icon className={`h-4 w-4 ${int.color}`} />
              <span className="font-medium">{int.name}</span>
              <span
                className={`h-2 w-2 rounded-full ml-1 ${int.status === "Healthy" ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* 2. Main GitOps Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="prs">Pull Requests</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
        </TabsList>

        {/* ================== TAB 1: PIPELINES & RELEASES ================== */}
        <TabsContent value="pipelines" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Pipelines</CardTitle>
                <CardDescription>
                  Live monitoring of pipeline runs (e.g GitHub Actions, Azure
                  DevOps).
                </CardDescription>
              </div>
              <Button size="sm">
                <PlayCircle className="mr-2 h-4 w-4" /> Trigger Workflow
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead className="w-1/3">Stage / Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PIPELINES.map((pipe) => (
                    <TableRow key={pipe.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                        {pipe.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{pipe.env}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{pipe.stage}</span>
                            <span>{pipe.progress}%</span>
                          </div>
                          <Progress
                            value={pipe.progress}
                            className={`h-2 ${pipe.status === "failed" ? "bg-red-100 dark:bg-red-900/20" : ""}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {pipe.status === "running" && (
                          <span className="flex items-center text-blue-600">
                            <Clock className="mr-1 h-3 w-3" /> Running
                          </span>
                        )}
                        {pipe.status === "success" && (
                          <span className="flex items-center text-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Passed
                          </span>
                        )}
                        {pipe.status === "failed" && (
                          <span className="flex items-center text-red-600">
                            <XCircle className="mr-1 h-3 w-3" /> Failed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== TAB 2: PULL REQUESTS ================== */}
        <TabsContent value="prs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>
                Live monitoring of Pull Requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR / Repo</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>PR Issue</TableHead>
                    <TableHead>CI Checks</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PULL_REQUESTS.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1">
                            <GitPullRequest className="h-3 w-3" /> {pr.id}{" "}
                            {pr.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            in {pr.repo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {pr.author[0]}
                            </AvatarFallback>
                          </Avatar>
                          {pr.author}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                        >
                          {pr.prIssue} <ExternalLink className="ml-1 h-3 w-3" />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${pr.checks.includes("passing") || pr.checks.includes("passed") ? "text-green-600" : "text-yellow-600"}`}
                        >
                          {pr.checks}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={
                            pr.status === "Merged" ? "outline" : "default"
                          }
                          disabled={pr.status === "Merged"}
                        >
                          {pr.status === "Merged" ? "Merged" : "Review"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== TAB 3: SECURITY & COMPLIANCE ================== */}
        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Critical Vulnerabilities
                  </p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-500">
                    2
                  </p>
                </div>
                <ShieldAlert className="h-8 w-8 text-red-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Code Smells (SonarQube)
                </p>
                <p className="text-3xl font-bold">14</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Test Coverage
                </p>
                <p className="text-3xl font-bold text-green-600">84.2%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Consolidated view from Dependabot and SonarQube.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Issue / Vulnerability</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Target Asset</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SECURITY_ALERTS.map((alert, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge
                          variant={
                            alert.severity === "Critical"
                              ? "destructive"
                              : alert.severity === "High"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.issue}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground flex items-center gap-1 mt-3">
                        <AlertCircle className="h-3 w-3" /> {alert.source}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {alert.package} {alert.version}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Patch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== TAB 4: REPOS ================== */}
        <TabsContent value="repositories" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Critical Vulnerabilities
                  </p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-500">
                    2
                  </p>
                </div>
                <ShieldAlert className="h-8 w-8 text-red-600" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Code Smells (SonarQube)
                </p>
                <p className="text-3xl font-bold">14</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Test Coverage
                </p>
                <p className="text-3xl font-bold text-green-600">84.2%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Consolidated view from Dependabot and SonarQube.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Issue / Vulnerability</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Target Asset</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repos.map((repo: any) => (
                    <TableRow key={repo.id}>
                      <TableCell className="font-medium">
                        <p
                          href={repo.url}
                          target="_blank"
                          className="flex items-center gap-2 hover:underline"
                        >
                          <GitBranch className="h-4 w-4" />
                          {repo.name}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium">
                        <a
                          href={repo.url}
                          target="_blank"
                          className="flex items-center gap-2 hover:underline"
                        >
                          <GitBranch className="h-4 w-4" />
                          {repo.language}
                        </a>
                      </TableCell>
                      <TableCell className="font-medium">
                        <a
                          href={repo.url}
                          target="_blank"
                          className="flex items-center gap-2 hover:underline"
                        >
                          <GitBranch className="h-4 w-4" />
                          {repo.updated_at}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
