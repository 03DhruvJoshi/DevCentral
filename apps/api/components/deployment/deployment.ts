import path from "node:path";
import dotenv from "dotenv";
import express, { IRouter } from "express";
import { fileURLToPath } from "node:url";

import { authenticateToken } from "../auth/authenticatetoken";
import prisma from "../../prisma.js";
import type { AuthenticatedRequest } from "../../api_types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const router: IRouter = express.Router();

const isValidRepoParam = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    /^[A-Za-z0-9_.-]+$/.test(value)
  );
};

// ─── Helpers: Vercel & Render API fetchers ─────────────────────────────────────

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: number;
  buildingAt: number | null;
  ready: number | null;
  target: string | null; // "production" | "staging" | null (null = preview)
  meta?: {
    githubCommitRef?: string;
    githubCommitRepo?: string;
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubDeployment?: string;
  };
}

interface NormalisedDeployment {
  id: string;
  provider: "vercel" | "render";
  environment: "production" | "preview" | "staging";
  status: "success" | "failed" | "building" | "cancelled";
  branch: string;
  commitMessage: string | null;
  commitSha: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  url: string | null;
}

function mapVercelState(state: string): NormalisedDeployment["status"] {
  switch (state) {
    case "READY":
      return "success";
    case "ERROR":
      return "failed";
    case "BUILDING":
    case "INITIALIZING":
    case "QUEUED":
      return "building";
    case "CANCELED":
      return "cancelled";
    default:
      return "building";
  }
}

function mapVercelEnv(
  target: string | null,
): NormalisedDeployment["environment"] {
  if (target === "production") return "production";
  if (target === "staging") return "staging";
  return "preview";
}

async function fetchVercelDeployments(
  apiToken: string,
  teamId: string | null,
  owner: string,
  repo: string,
  since: number,
): Promise<NormalisedDeployment[]> {
  const params = new URLSearchParams({ limit: "100", since: String(since) });
  if (teamId) params.set("teamId", teamId);

  const url = `https://api.vercel.com/v6/deployments?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok) throw new Error(`Vercel API error ${res.status}`);

  const data = (await res.json()) as { deployments: VercelDeployment[] };
  const repoSlug = `${owner}/${repo}`.toLowerCase();

  return data.deployments
    .filter((d) => {
      const metaRepo = d.meta?.githubCommitRepo?.toLowerCase() ?? "";
      // Include if meta matches or if no meta (we can't filter further without project mapping)
      return (
        !metaRepo ||
        metaRepo.includes(repo.toLowerCase()) ||
        metaRepo === repoSlug
      );
    })
    .map((d): NormalisedDeployment => {
      const startedAt = new Date(d.createdAt).toISOString();
      const buildStart = d.buildingAt ?? d.createdAt;
      const buildEnd = d.ready ?? null;
      const durationSec = buildEnd
        ? Math.round((buildEnd - buildStart) / 1000)
        : null;
      return {
        id: d.uid,
        provider: "vercel",
        environment: mapVercelEnv(d.target),
        status: mapVercelState(d.state),
        branch: d.meta?.githubCommitRef ?? "unknown",
        commitMessage: d.meta?.githubCommitMessage ?? null,
        commitSha: d.meta?.githubCommitSha ?? null,
        startedAt,
        finishedAt: buildEnd ? new Date(buildEnd).toISOString() : null,
        durationSec,
        url: `https://${d.url}`,
      };
    });
}

interface RenderService {
  service: {
    id: string;
    name: string;
    slug?: string;
    repo?: string | null;
    branch?: string | null;
    dashboardUrl?: string | null;
    type: string;
  };
  cursor?: string;
}

interface RenderDeploy {
  deploy: {
    id: string;
    status: string;
    createdAt: string;
    startedAt?: string | null;
    finishedAt: string | null;
    commit: { id: string; message: string } | null;
  };
  cursor?: string;
}

function mapRenderStatus(status: string): NormalisedDeployment["status"] {
  switch (status) {
    case "live":
      return "success";
    case "build_failed":
    case "update_failed":
      return "failed";
    case "build_in_progress":
    case "update_in_progress":
      return "building";
    case "deactivated":
    case "canceled":
      return "cancelled";
    default:
      return "building";
  }
}

async function fetchRenderDeployments(
  apiToken: string,
  owner: string,
  repo: string,
  since: Date,
): Promise<NormalisedDeployment[]> {
  // Render list endpoints are paginated arrays with per-item cursors.
  const services: RenderService[] = [];
  let servicesCursor: string | null = null;

  while (true) {
    const svcParams = new URLSearchParams({
      includePreviews: "true",
      limit: "100",
    });
    if (servicesCursor) svcParams.set("cursor", servicesCursor);

    const svcRes = await fetch(
      `https://api.render.com/v1/services?${svcParams}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!svcRes.ok)
      throw new Error(`Render services API error ${svcRes.status}`);

    const page = (await svcRes.json()) as RenderService[];
    if (!Array.isArray(page) || page.length === 0) break;
    services.push(...page);

    const nextCursor = page[page.length - 1]?.cursor ?? null;
    if (!nextCursor || page.length < 100) break;
    servicesCursor = nextCursor;
  }

  const normalizedRepoSuffix = `${owner}/${repo}`.toLowerCase();
  const matchingServices = services.filter((s) => {
    const serviceRepo = (s.service.repo ?? "").toLowerCase();
    const serviceSlug = (s.service.slug ?? "").toLowerCase();
    const serviceName = (s.service.name ?? "").toLowerCase();

    return (
      serviceRepo.includes(normalizedRepoSuffix) ||
      serviceRepo.endsWith(`/${repo.toLowerCase()}`) ||
      serviceRepo.endsWith(`/${repo.toLowerCase()}.git`) ||
      serviceSlug === repo.toLowerCase() ||
      serviceName === repo.toLowerCase()
    );
  });

  if (matchingServices.length === 0) return [];

  const allDeploys: NormalisedDeployment[] = [];

  await Promise.all(
    matchingServices.map(async (svc) => {
      let deployCursor: string | null = null;

      while (true) {
        const deployParams = new URLSearchParams({
          limit: "100",
          createdAfter: since.toISOString(),
        });
        if (deployCursor) deployParams.set("cursor", deployCursor);

        const dRes = await fetch(
          `https://api.render.com/v1/services/${svc.service.id}/deploys?${deployParams}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              Accept: "application/json",
            },
          },
        );

        if (!dRes.ok) {
          console.warn(
            `Render deploy list failed for service ${svc.service.id}: ${dRes.status}`,
          );
          break;
        }

        const page = (await dRes.json()) as RenderDeploy[];
        if (!Array.isArray(page) || page.length === 0) break;

        page.forEach(({ deploy: d }) => {
          if (new Date(d.createdAt) < since) return;
          const start = new Date(d.startedAt ?? d.createdAt);
          const end = d.finishedAt ? new Date(d.finishedAt) : null;
          allDeploys.push({
            id: d.id,
            provider: "render",
            environment: "production", // Most Render deploys map to production env.
            status: mapRenderStatus(d.status),
            branch: svc.service.branch ?? "main",
            commitMessage: d.commit?.message ?? null,
            commitSha: d.commit?.id ?? null,
            startedAt: start.toISOString(),
            finishedAt: end?.toISOString() ?? null,
            durationSec: end
              ? Math.round((end.getTime() - start.getTime()) / 1000)
              : null,
            url: svc.service.dashboardUrl ?? null,
          });
        });

        const nextCursor = page[page.length - 1]?.cursor ?? null;
        if (!nextCursor || page.length < 100) break;
        deployCursor = nextCursor;
      }
    }),
  );

  return allDeploys;
}

// ─── Deployment Analytics Endpoint ────────────────────────────────────────────

router.get(
  "/api/analytics/deployments/:owner/:repo",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { owner, repo } = req.params;
      if (!isValidRepoParam(owner) || !isValidRepoParam(repo)) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const days = Math.min(Number(req.query.days) || 30, 90);
      const since = new Date(Date.now() - days * 86_400_000);

      const integrations = await prisma.providerIntegration.findMany({
        where: { userId: req.user!.id },
      });

      const vercelIntegration = integrations.find(
        (i) => i.provider === "vercel",
      );
      const renderIntegration = integrations.find(
        (i) => i.provider === "render",
      );

      if (!vercelIntegration && !renderIntegration) {
        return res.status(200).json({ noIntegrations: true, deployments: [] });
      }

      const [vercelDeploys, renderDeploys] = await Promise.all([
        vercelIntegration
          ? fetchVercelDeployments(
              vercelIntegration.apiToken,
              vercelIntegration.teamId,
              owner,
              repo,
              since.getTime(),
            ).catch((e) => {
              console.error("Vercel fetch error:", e);
              return [] as NormalisedDeployment[];
            })
          : Promise.resolve([] as NormalisedDeployment[]),
        renderIntegration
          ? fetchRenderDeployments(
              renderIntegration.apiToken,
              owner,
              repo,
              since,
            ).catch((e) => {
              console.error("Render fetch error:", e);
              return [] as NormalisedDeployment[];
            })
          : Promise.resolve([] as NormalisedDeployment[]),
      ]);

      const allDeploys = [...vercelDeploys, ...renderDeploys].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );

      // Compute summary stats
      const total = allDeploys.length;
      const successful = allDeploys.filter(
        (d) => d.status === "success",
      ).length;
      const successRate =
        total > 0 ? +((successful / total) * 100).toFixed(1) : 0;

      const completedWithDuration = allDeploys.filter(
        (d) => d.durationSec !== null && d.status !== "building",
      );
      const avgDurationSec =
        completedWithDuration.length > 0
          ? Math.round(
              completedWithDuration.reduce((s, d) => s + d.durationSec!, 0) /
                completedWithDuration.length,
            )
          : null;

      const deploysPerDay = +(total / days).toFixed(2);

      // Frequency over time (daily bucketed)
      const dailyMap: Record<string, { vercel: number; render: number }> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { vercel: 0, render: 0 };
      }
      allDeploys.forEach((d) => {
        const key = d.startedAt.slice(0, 10);
        if (dailyMap[key]) {
          dailyMap[key][d.provider]++;
        }
      });
      const frequencyOverTime = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date,
          vercel: counts.vercel,
          render: counts.render,
          total: counts.vercel + counts.render,
        }));

      // Duration distribution buckets (in minutes)
      const buckets = [
        { label: "< 1 min", min: 0, max: 60 },
        { label: "1–2 min", min: 60, max: 120 },
        { label: "2–3 min", min: 120, max: 180 },
        { label: "3–5 min", min: 180, max: 300 },
        { label: "5–10 min", min: 300, max: 600 },
        { label: "> 10 min", min: 600, max: Infinity },
      ];
      const durationDistribution = buckets.map((b) => ({
        label: b.label,
        vercel: vercelDeploys.filter(
          (d) =>
            d.durationSec !== null &&
            d.durationSec >= b.min &&
            d.durationSec < b.max,
        ).length,
        render: renderDeploys.filter(
          (d) =>
            d.durationSec !== null &&
            d.durationSec >= b.min &&
            d.durationSec < b.max,
        ).length,
      }));

      // Environment breakdown
      const envCounts: Record<string, number> = {
        production: 0,
        preview: 0,
        staging: 0,
      };
      allDeploys.forEach((d) => {
        envCounts[d.environment] = (envCounts[d.environment] ?? 0) + 1;
      });
      const envBreakdown = [
        { name: "Production", value: envCounts.production, color: "#6366f1" },
        { name: "Preview", value: envCounts.preview, color: "#8b5cf6" },
        { name: "Staging", value: envCounts.staging, color: "#a78bfa" },
      ].filter((e) => (e.value ?? 0) > 0);

      // Provider stats
      const buildProviderStats = (
        deploys: NormalisedDeployment[],
        name: string,
        color: string,
      ) => {
        const t = deploys.length;
        const s = deploys.filter((d) => d.status === "success").length;
        const withDur = deploys.filter((d) => d.durationSec !== null);
        const avgMin = withDur.length
          ? +(
              withDur.reduce((a, d) => a + d.durationSec!, 0) /
              withDur.length /
              60
            ).toFixed(1)
          : null;
        const last = deploys[0]?.startedAt ?? null;
        return {
          provider: name,
          totalDeploys: t,
          successRate: t > 0 ? +((s / t) * 100).toFixed(1) : 0,
          avgDurationMin: avgMin,
          lastDeployAt: last,
          color,
        };
      };

      const providerStats = [];
      if (vercelIntegration)
        providerStats.push(
          buildProviderStats(vercelDeploys, "Vercel", "#000000"),
        );
      if (renderIntegration)
        providerStats.push(
          buildProviderStats(renderDeploys, "Render", "#46E3B7"),
        );

      // ── Status breakdown ────────────────────────────────────────────────────
      const statusBreakdown = {
        success: allDeploys.filter((d) => d.status === "success").length,
        failed: allDeploys.filter((d) => d.status === "failed").length,
        building: allDeploys.filter((d) => d.status === "building").length,
        cancelled: allDeploys.filter((d) => d.status === "cancelled").length,
      };

      // ── Branch activity ──────────────────────────────────────────────────────
      const branchMap: Record<
        string,
        { total: number; success: number; failed: number; durations: number[] }
      > = {};
      allDeploys.forEach((d) => {
        if (!branchMap[d.branch])
          branchMap[d.branch] = {
            total: 0,
            success: 0,
            failed: 0,
            durations: [],
          };
        branchMap[d.branch]!.total++;
        if (d.status === "success") branchMap[d.branch]!.success++;
        if (d.status === "failed") branchMap[d.branch]!.failed++;
        if (d.durationSec !== null)
          branchMap[d.branch]!.durations.push(d.durationSec);
      });
      const branchActivity = Object.entries(branchMap)
        .map(([branch, s]) => ({
          branch,
          total: s.total,
          success: s.success,
          failed: s.failed,
          successRate:
            s.total > 0 ? +((s.success / s.total) * 100).toFixed(1) : 0,
          avgDurationSec:
            s.durations.length > 0
              ? Math.round(
                  s.durations.reduce((a, b) => a + b, 0) / s.durations.length,
                )
              : null,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // ── Peak hours (UTC) ─────────────────────────────────────────────────────
      const peakHourMap: Record<number, number> = {};
      for (let h = 0; h < 24; h++) peakHourMap[h] = 0;
      allDeploys.forEach((d) => {
        const h = new Date(d.startedAt).getUTCHours();
        peakHourMap[h] = (peakHourMap[h] ?? 0) + 1;
      });
      const peakHours = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, "0")}:00`,
        count: peakHourMap[h] ?? 0,
      }));

      // ── Day of week distribution ─────────────────────────────────────────────
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekdayMap: Record<number, number> = {};
      for (let d = 0; d < 7; d++) weekdayMap[d] = 0;
      allDeploys.forEach((d) => {
        const day = new Date(d.startedAt).getUTCDay();
        weekdayMap[day] = (weekdayMap[day] ?? 0) + 1;
      });
      const weekdayDist = Array.from({ length: 7 }, (_, d) => ({
        day: dayNames[d]!,
        count: weekdayMap[d] ?? 0,
      }));

      // ── Failed deployments detail ────────────────────────────────────────────
      const failedDeployments = allDeploys
        .filter((d) => d.status === "failed")
        .slice(0, 15);

      // ── Longest builds ───────────────────────────────────────────────────────
      const longestBuilds = [...completedWithDuration]
        .sort((a, b) => (b.durationSec ?? 0) - (a.durationSec ?? 0))
        .slice(0, 5);

      // ── Failure rate over time ───────────────────────────────────────────────
      const failureRateOverTime = frequencyOverTime.map((day) => {
        const dayDeploys = allDeploys.filter(
          (d) => d.startedAt.slice(0, 10) === day.date,
        );
        const failed = dayDeploys.filter((d) => d.status === "failed").length;
        return {
          date: day.date,
          total: dayDeploys.length,
          failed,
          success: dayDeploys.filter((d) => d.status === "success").length,
          failureRate:
            dayDeploys.length > 0
              ? +((failed / dayDeploys.length) * 100).toFixed(1)
              : 0,
        };
      });

      // ── MTTR (mean time to recovery) ─────────────────────────────────────────
      const computeMTTR = (deploys: NormalisedDeployment[]): number | null => {
        const sorted = [...deploys].sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
        );
        const times: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i]!.status === "failed") {
            for (let j = i + 1; j < sorted.length; j++) {
              if (sorted[j]!.status === "success") {
                times.push(
                  (new Date(sorted[j]!.startedAt).getTime() -
                    new Date(sorted[i]!.startedAt).getTime()) /
                    60_000,
                );
                break;
              }
            }
          }
        }
        if (times.length === 0) return null;
        return +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
      };
      const mttrMin = computeMTTR(allDeploys);

      // ── Velocity trend (recent half-period vs older half-period) ─────────────
      const halfDays = Math.max(1, Math.floor(days / 2));
      const midpoint = new Date(Date.now() - halfDays * 86_400_000);
      const recentHalf = allDeploys.filter(
        (d) => new Date(d.startedAt) >= midpoint,
      ).length;
      const olderHalf = allDeploys.filter(
        (d) => new Date(d.startedAt) < midpoint,
      ).length;
      const velocityTrend = {
        recent: +(recentHalf / halfDays).toFixed(2),
        older: +(olderHalf / halfDays).toFixed(2),
        changePct:
          olderHalf > 0
            ? +(((recentHalf - olderHalf) / olderHalf) * 100).toFixed(1)
            : null,
      };

      res.json({
        summary: {
          totalDeploys: total,
          successRate,
          avgDurationSec,
          deploysPerDay,
          failedDeploys: statusBreakdown.failed,
          mttrMin,
        },
        frequencyOverTime,
        failureRateOverTime,
        durationDistribution,
        envBreakdown,
        providerStats,
        statusBreakdown,
        branchActivity,
        peakHours,
        weekdayDist,
        failedDeployments,
        longestBuilds,
        velocityTrend,
        recentDeployments: allDeploys.slice(0, 50),
        connectedProviders: {
          vercel: !!vercelIntegration,
          render: !!renderIntegration,
        },
      });
    } catch (err) {
      console.error("Deployment analytics error:", err);
      res.status(500).json({ error: "Failed to fetch deployment analytics" });
    }
  },
);

export default router;
