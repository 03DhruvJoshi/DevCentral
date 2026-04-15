import { useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  GitBranch,
  ExternalLink,
  Calendar,
  Settings,
  Globe,
  Server,
  Cloud,
  AlertTriangle,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Button } from "../../../../components/ui/button.js";
import { Input } from "../../../../components/ui/input.js";
import { Label } from "../../../../components/ui/label.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/avatar.js";

import { TableControls } from "../TableControls.js";
import {
  type ServiceDef,
  type DeploymentSortCol,
  type DeployTargetPickerProps,
  type SecretItem,
} from "./types.js";

import {
  type GitHubDeployment,
  type GitHubEnvironment,
  type DeploymentServiceAvailabilityResponse,
} from "../types.js";

function DeploymentSortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: DeploymentSortCol;
  sortCol: DeploymentSortCol;
  sortDir: "asc" | "desc";
}) {
  if (sortCol !== col) {
    return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  }

  return sortDir === "asc" ? (
    <ChevronUp className="h-3 w-3 text-indigo-600" />
  ) : (
    <ChevronDown className="h-3 w-3 text-indigo-600" />
  );
}

function buildVisiblePages(totalPages: number, activePage: number) {
  const pages: number[] = [];
  const start = Math.max(1, activePage - 2);
  const end = Math.min(totalPages, activePage + 2);

  for (let index = start; index <= end; index += 1) {
    pages.push(index);
  }

  return pages;
}

function DeploymentHistorySection({
  deployments,
  isEnvLoading,
  search,
  setSearch,
  envFilter,
  setEnvFilter,
  rowsPerPage,
  setRowsPerPage,
  page,
  setPage,
  uniqueEnvironments,
  sortCol,
  sortDir,
  handleSort,
}: {
  deployments: GitHubDeployment[];
  isEnvLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  envFilter: string;
  setEnvFilter: (value: string) => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  uniqueEnvironments: string[];
  sortCol: DeploymentSortCol;
  sortDir: "asc" | "desc";
  handleSort: (col: DeploymentSortCol) => void;
}) {
  const filteredDeployments = useMemo(() => {
    return deployments.filter((deployment) => {
      const matchesSearch =
        search === "" ||
        deployment.environment.toLowerCase().includes(search.toLowerCase()) ||
        deployment.ref.toLowerCase().includes(search.toLowerCase()) ||
        (deployment.creator?.login ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        deployment.sha.startsWith(search);
      const matchesEnv =
        envFilter === "all" || deployment.environment === envFilter;
      return matchesSearch && matchesEnv;
    });
  }, [deployments, search, envFilter]);

  const sortedDeployments = useMemo(() => {
    return [...filteredDeployments].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortCol) {
        case "createdAt":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "creator":
          aVal = a.creator?.login ?? "";
          bVal = b.creator?.login ?? "";
          break;
        case "sha":
          aVal = a.sha;
          bVal = b.sha;
          break;
        case "environment":
          aVal = a.environment;
          bVal = b.environment;
          break;
        default:
          aVal = a.ref;
          bVal = b.ref;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredDeployments, sortCol, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDeployments.length / rowsPerPage),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedDeployments = sortedDeployments.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage,
  );
  const visiblePages = buildVisiblePages(totalPages, safePage);

  return (
    <section>
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <GitBranch className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Deployment History
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Full deployment history — sort by any column. Use search and
                filters above to narrow results.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shrink-0">
            {filteredDeployments.length} deployment
            {filteredDeployments.length === 1 ? "" : "s"}
            {envFilter !== "all" && ` · ${envFilter}`}
          </span>
        </div>

        <CardContent className="p-0">
          <TableControls
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search by environment, ref, or author..."
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            onPageChange={setPage}
            extraFilters={
              <select
                value={envFilter}
                onChange={(event) => {
                  setEnvFilter(event.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
              >
                <option value="all">All Environments</option>
                {uniqueEnvironments.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            }
          />

          {isEnvLoading ? (
            <div className="flex items-center gap-2 justify-center py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading deployments…
            </div>
          ) : paginatedDeployments.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <GitBranch className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                No deployments match the current filters.
              </p>
              <p className="text-xs text-slate-400">
                Try adjusting the filters above to see results.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 text-left">
                      <button
                        onClick={() => handleSort("environment")}
                        className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Environment
                        <DeploymentSortIcon
                          col="environment"
                          sortCol={sortCol}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-left">
                      <button
                        onClick={() => handleSort("ref")}
                        className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Ref / SHA
                        <DeploymentSortIcon
                          col="ref"
                          sortCol={sortCol}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-left">
                      <button
                        onClick={() => handleSort("creator")}
                        className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Deployed By
                        <DeploymentSortIcon
                          col="creator"
                          sortCol={sortCol}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-left">
                      <button
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Date
                        <DeploymentSortIcon
                          col="createdAt"
                          sortCol={sortCol}
                          sortDir={sortDir}
                        />
                      </button>
                    </th>
                    <th className="py-2.5 px-4 text-center font-semibold text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDeployments.map((deployment) => (
                    <tr
                      key={deployment.id}
                      className="hover:bg-white transition-colors bg-slate-50 align-top"
                    >
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {deployment.environment}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-slate-400" />
                            <code className="text-xs text-slate-700">
                              {deployment.ref}
                            </code>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {deployment.sha.slice(0, 7)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {deployment.creator ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 ring-1 ring-slate-200">
                              <AvatarImage
                                src={deployment.creator.avatar_url}
                              />
                              <AvatarFallback className="text-[9px]">
                                {deployment.creator.login[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-slate-600">
                              {deployment.creator.login}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-700">
                            {new Date(
                              deployment.created_at,
                            ).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(
                              deployment.created_at,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 hover:bg-slate-100"
                          asChild
                        >
                          <a
                            href={deployment.url
                              .replace("api.github.com/repos", "github.com")
                              .replace("/deployments/", "/deployments#")}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {sortedDeployments.length === 0 ? (
                "No results"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {(safePage - 1) * rowsPerPage + 1}–
                    {Math.min(safePage * rowsPerPage, sortedDeployments.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {sortedDeployments.length}
                  </span>
                </>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {visiblePages.map((visiblePage) => (
                  <button
                    key={visiblePage}
                    onClick={() => setPage(visiblePage)}
                    className={`h-7 w-7 text-xs rounded-md border transition-colors ${
                      visiblePage === safePage
                        ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {visiblePage}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={safePage >= totalPages}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deploymentStatusBadge(env: string, deployments: GitHubDeployment[]) {
  const latest = deployments.find((d) => d.environment === env);
  if (!latest)
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>Never deployed</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span>Live</span>
    </span>
  );
}

// ── Service card definitions ──────────────────────────────────────────────────

// Builds the services list using real detection results for the three live
// services; AWS, GCP, and Azure remain static "coming_soon" entries.
function buildServices(
  availability: DeploymentServiceAvailabilityResponse | null,
): ServiceDef[] {
  const ghStatus = availability?.githubActions.status ?? "available";
  const vercelStatus = availability?.vercel.status ?? "available";
  const renderStatus = availability?.render.status ?? "available";

  return [
    {
      id: "github-actions",
      name: "GitHub Actions",
      status: ghStatus,
      icon: GitBranch,
      iconColor: "text-gray-700",
      iconBg: "bg-gray-100",
      description:
        ghStatus === "connected"
          ? "Active workflows detected in this repository. Select a workflow in the Deploy panel below to trigger a one-click deployment straight from DevCentral."
          : "No active workflows found. Create a workflow file with a workflow_dispatch trigger to enable one-click deployments from DevCentral.",
    },
    {
      id: "vercel",
      name: "Vercel",
      status: vercelStatus,
      icon: Globe,
      iconColor: "text-black",
      iconBg: "bg-slate-100",
      description:
        vercelStatus === "connected"
          ? "Vercel is actively deploying this repository. Deployment events are tracked automatically via GitHub Deployments — check the history below for the latest."
          : "Vercel automatically creates GitHub Deployment events on each push. Install the Vercel GitHub App on this repository to start tracking deployments here.",
      guideTitle: "Connect Vercel",
      guideSteps: [
        "Go to vercel.com → Settings → Git",
        "Install the Vercel GitHub App on your repository",
        "Vercel will now auto-create GitHub Deployments on each push",
        "Deployments will appear in the history table below automatically",
      ],
    },
    {
      id: "render",
      name: "Render",
      status: renderStatus,
      icon: Server,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      description:
        renderStatus === "connected"
          ? "Render is actively deploying this repository and posting GitHub Deployment events. Deployment history is tracked automatically below."
          : "Render creates GitHub Deployment events when it deploys your services. Connect this repository to Render to track deployments here.",
      guideTitle: "Connect Render",
      guideSteps: [
        "Go to render.com and open your Web Service dashboard",
        "Connect your GitHub account in Render if it is not already connected",
        "Select your repository and branch in Render service settings",
        "Install and authorize the Render GitHub integration/app for this repository",
        "Enable automatic deploys so Render tracks new commits and deployment activity",
      ],
    },
    {
      id: "aws",
      name: "AWS",
      description:
        "Deploy to ECS, Lambda, Elastic Beanstalk, or App Runner via GitHub Actions. Use aws-actions/configure-aws-credentials in your workflow.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
    },
    {
      id: "gcp",
      name: "Google Cloud",
      description:
        "Deploy to Cloud Run, App Engine, or GKE using google-github-actions/* in your deployment workflow.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      id: "azure",
      name: "Azure",
      description:
        "Deploy to App Service, Container Apps, or AKS using Azure/login and Azure/webapps-deploy GitHub Actions.",
      status: "coming_soon" as const,
      icon: Cloud,
      iconColor: "text-sky-500",
      iconBg: "bg-sky-50",
    },
  ];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onGuide,
}: {
  service: ServiceDef;
  onGuide: (s: ServiceDef) => void;
}) {
  const Icon = service.icon;
  return (
    <Card className="flex flex-col border-slate-200 bg-white/95 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${service.iconBg}`}>
              <Icon className={`h-4 w-4 ${service.iconColor}`} />
            </div>
            <CardTitle className="text-sm font-semibold">
              {service.name}
            </CardTitle>
          </div>
          {service.status === "connected" ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Connected</span>
            </span>
          ) : service.status === "coming_soon" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
              Soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              Available
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          {service.description}
        </p>
        {service.status === "available" && service.guideTitle && (
          <Button
            size="sm"
            variant="outline"
            className="w-fit text-xs border-slate-200 bg-white hover:bg-slate-50"
            onClick={() => onGuide(service)}
          >
            <Settings className="h-3 w-3 mr-1.5" />
            Setup Guide
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EnvironmentCard({
  env,
  deployments,
  index,
  total,
}: {
  env: GitHubEnvironment;
  deployments: GitHubDeployment[];
  index: number;
  total: number;
}) {
  const latest = deployments.find((d) => d.environment === env.name);
  const isLast = index === total - 1;

  // Give each stage a distinct accent — first = dev/staging, last = production
  const stageColor =
    index === 0
      ? "border-l-sky-300"
      : isLast
        ? "border-l-emerald-400"
        : "border-l-violet-300";

  return (
    <Card
      className={`w-full border-l-4 ${stageColor} border-slate-200 bg-white/95 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-sm capitalize text-slate-900">
              {env.name}
            </p>
            {env.protection_rules && env.protection_rules.length > 0 && (
              <p className="text-xs text-slate-500">
                Protected · {env.protection_rules.length} rule
                {env.protection_rules.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {latest ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Live</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <span>Idle</span>
            </span>
          )}
        </div>

        {latest ? (
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              <code className="font-mono text-slate-700">{latest.ref}</code>
            </div>
            {latest.creator && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4 ring-1 ring-slate-200">
                  <AvatarImage src={latest.creator.avatar_url} />
                  <AvatarFallback>{latest.creator.login[0]}</AvatarFallback>
                </Avatar>
                <span>{latest.creator.login}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {new Date(latest.created_at).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No deployments yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function DeployTargetPicker({
  deployMode,
  setDeployMode,
  deployBranch,
  setDeployBranch,
  deployCommitSha,
  setDeployCommitSha,
  branches,
  recentCommits,
}: DeployTargetPickerProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Deploy target</Label>
        <div className="flex gap-2">
          {(
            [
              { value: "latest", label: "Latest on branch" },
              { value: "specific", label: "Specific commit" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDeployMode(value)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                deployMode === value
                  ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {deployMode === "latest" ? (
        <div className="space-y-2">
          <Label>Branch</Label>
          {branches.length > 0 ? (
            <select
              value={deployBranch}
              onChange={(e) => setDeployBranch(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <GitBranch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 font-mono"
                placeholder="main"
                value={deployBranch}
                onChange={(e) => setDeployBranch(e.target.value)}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The workflow runs at the HEAD of this branch.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Commit</Label>
          {recentCommits.length > 0 ? (
            <select
              value={deployCommitSha}
              onChange={(e) => setDeployCommitSha(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
            >
              {recentCommits.map((c) => (
                <option key={c.sha} value={c.sha}>
                  {c.message.split("\n")[0]} ({c.sha.slice(0, 7)}) by {c.author}
                </option>
              ))}
            </select>
          ) : (
            <Input
              className="font-mono"
              placeholder="e.g. a3f2c1d or full 40-char SHA"
              value={deployCommitSha}
              onChange={(e) => setDeployCommitSha(e.target.value)}
            />
          )}
          <p className="text-xs text-muted-foreground">
            The workflow will run at the exact commit SHA above.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Workflow setup guide (shown when no provider workflow is detected) ─────────

function WorkflowSetupGuide({
  service,
  owner,
  repo,
  isCreatingPr,
  setupMsg,
  onCreatePr,
  secrets,
}: {
  service: "vercel" | "render";
  owner: string;
  repo: string;
  isCreatingPr: boolean;
  setupMsg: { type: "success" | "error"; text: string; prUrl?: string } | null;
  onCreatePr: () => void;
  secrets: SecretItem[];
}) {
  const label = service === "vercel" ? "Vercel" : "Render";
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-4">
      <div className="space-y-1">
        <p className="font-medium text-sm">
          Connect {label} via GitHub Actions
        </p>
        <p className="text-xs text-muted-foreground">
          No {label} deployment workflow found in this repository. DevCentral
          can open a pull request that adds a ready-made workflow file. Once you
          merge it, you can trigger {label} deploys from here with a single
          click — no credentials stored in DevCentral.
        </p>

        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mt-4">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Important: Create a new <strong>"Repository secret"</strong> (not an
          "Environment secret") to ensure the workflow can access it without
          additional configuration.
        </div>
      </div>

      {/* Secrets checklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium">
          Required GitHub Secrets (add before merging the PR)
        </p>
        <div className="rounded-md border bg-muted/30 divide-y">
          {secrets.map((s) => (
            <div key={s.name} className="flex items-start gap-3 px-3 py-2">
              <code className="text-xs font-mono bg-background border rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                {s.name}
              </code>
              <span className="text-xs text-muted-foreground leading-relaxed">
                {s.hint}
              </span>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white w-fit text-xs"
          asChild
        >
          <a
            href={`https://github.com/${owner}/${repo}/settings/secrets/actions`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open GitHub Secrets Settings
          </a>
        </Button>
      </div>

      {/* Create PR button + feedback */}
      <div className="space-y-2">
        <Button
          onClick={onCreatePr}
          disabled={isCreatingPr}
          size="sm"
          className="gap-1.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 rounded-2xl hover:bg-blue-700 text-white"
        >
          {isCreatingPr ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {isCreatingPr
            ? "Creating PR..."
            : `Create PR with ${label} Deployment Workflow`}
        </Button>

        {setupMsg && (
          <div
            className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
              setupMsg.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {setupMsg.type === "error" ? (
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-1">
              <span>{setupMsg.text}</span>
              {setupMsg.prUrl && (
                <a
                  href={setupMsg.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View pull request on GitHub
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export {
  EnvironmentCard,
  ServiceCard,
  DeployTargetPicker,
  WorkflowSetupGuide,
  deploymentStatusBadge,
  buildServices,
};
