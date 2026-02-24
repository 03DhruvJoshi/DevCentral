import path from "path";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import { IRouter } from "express";
import { Octokit } from "octokit";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const sonarToken = `${process.env.SONAR_TOKEN}`;

const githubToken = `${process.env.GITHUB_TOKEN}`;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: any, decodedUser: any) => {
      if (err) {
        return res
          .status(403)
          .json({ error: "Invalid or expired session. Please log in again." });
      }

      req.user = decodedUser;
      next();
    },
  );
};

const isValidRepoParam = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    /^[A-Za-z0-9_.-]+$/.test(value)
  );
};
router.get(
  "/api/analytics/sonar/:owner/:repo",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      if (!isValidRepoParam(owner) || !isValidRepoParam(repo)) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const projectKey = `${owner}_${repo}`;

      const metricKeys = [
        "alert_status",
        "bugs",
        "vulnerabilities",
        "security_hotspots",
        "code_smells",
        "coverage",
        "duplicated_lines_density",
        "security_rating",
        "reliability_rating",
      ].join(",");

      const sonarUrl = `https://sonarcloud.io/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}`;

      const response = await fetch(sonarUrl, {
        headers: {
          // Base64 encode the token with a trailing colon for Basic Auth
          Authorization: `Basic ${Buffer.from(sonarToken + ":").toString("base64")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res
            .status(404)
            .json({ error: "Project not found in SonarQube" });
        }
        throw new Error(`Sonar API error: ${response.statusText}`);
      }

      const data = await response.json();
      interface Measure {
        metric: string;
        value: number;
      }
      const metricsMap = data.component.measures.reduce(
        (acc: Record<string, number>, measure: Measure) => {
          acc[measure.metric] = measure.value;
          return acc;
        },
        {},
      );

      res.json(metricsMap);
    } catch (error) {
      console.error("SonarQube Error:", error);
      res.status(400).json({ error: "Invalid request parameters" });
      res.status(404).json({ error: "Project not found in SonarQube" });
      res.status(401).json({ error: "Unauthorized: Invalid SonarQube token" });
      res.status(500).json({ error: "Failed to fetch metrics from SonarQube" });
    }
  },
);

// Developer Velocity — single endpoint for PR quality & health metrics
router.get(
  "/api/analytics/velocity/:owner/:repo",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const now = Date.now();
      const STALE_MS = 14 * 86_400_000;

      // Fetch open + recently closed PRs in parallel
      const [{ data: open }, { data: closed }] = await Promise.all([
        octokit.rest.pulls.list({ owner, repo, state: "open", per_page: 30 }),
        octokit.rest.pulls.list({
          owner,
          repo,
          state: "closed",
          sort: "updated",
          direction: "desc",
          per_page: 30,
        }),
      ]);

      const merged = closed.filter((pr) => pr.merged_at);

      // PR review time & merge time (from merged PRs)
      const reviewStats = await Promise.all(
        merged.slice(0, 15).map(async (pr) => {
          const { data: reviews } = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: pr.number,
          });
          const firstReview = reviews
            .filter((r) => r.user?.id !== pr.user?.id)
            .sort(
              (a, b) =>
                new Date(a.submitted_at!).getTime() -
                new Date(b.submitted_at!).getTime(),
            )[0];
          const created = new Date(pr.created_at).getTime();
          return {
            number: pr.number,
            title: pr.title,
            time_to_first_review_h: firstReview
              ? +(
                  (new Date(firstReview.submitted_at!).getTime() - created) /
                  3_600_000
                ).toFixed(1)
              : null,
            time_to_merge_h: +(
              (new Date(pr.merged_at!).getTime() - created) /
              3_600_000
            ).toFixed(1),
          };
        }),
      );

      const avg = (nums: number[]) =>
        nums.length
          ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
          : null;
      const reviewTimes = reviewStats
        .map((r) => r.time_to_first_review_h)
        .filter((v): v is number => v !== null);
      const mergeTimes = reviewStats.map((r) => r.time_to_merge_h);

      // PR size buckets
      const sizeOf = (c: number) =>
        c < 10 ? "XS" : c < 50 ? "S" : c < 250 ? "M" : c < 1000 ? "L" : "XL";
      const allPRs = [...open, ...closed].slice(0, 30);
      const sizes = await Promise.all(
        allPRs.map(async (pr) => {
          const { data } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });
          return sizeOf(data.additions + data.deletions);
        }),
      );
      const sizeDistribution = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
      sizes.forEach((s) => sizeDistribution[s]++);

      // Stale PRs (open, no update in 14 days)
      const stalePRs = open
        .filter((pr) => now - new Date(pr.updated_at).getTime() > STALE_MS)
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          days_stale: +(
            (now - new Date(pr.updated_at).getTime()) /
            86_400_000
          ).toFixed(0),
        }));

      // Merge conflicts (open PRs with dirty mergeable_state)
      const conflicts = await Promise.all(
        open.slice(0, 20).map(async (pr) => {
          const { data } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });
          return data.mergeable_state === "dirty"
            ? { number: data.number, title: data.title }
            : null;
        }),
      );

      res.json({
        review_time: {
          avg_first_review_h: avg(reviewTimes),
          avg_merge_h: avg(mergeTimes),
          prs: reviewStats,
        },
        pr_size_distribution: sizeDistribution,
        stale_prs: stalePRs,
        merge_conflicts: conflicts.filter(Boolean),
        reopened_count: null, // requires timeline API; add if needed
      });
    } catch (error) {
      console.error("GitHub Error:", error);
      res.status(500).json({ error: "Failed to fetch velocity metrics" });
    }
  },
);

// CI/CD Quality Signals — pipeline health, flaky runs, slow jobs, queue time
router.get(
  "/api/analytics/cicd/:owner/:repo",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;

      // Fetch recent workflow runs
      const { data: runsData } =
        await octokit.rest.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          per_page: 100,
        });
      const runs = runsData.workflow_runs;

      // 1. Success rate over time (grouped by day)
      const dailyStats: Record<
        string,
        { success: number; failure: number; total: number }
      > = {};
      runs.forEach((r) => {
        const day = r.created_at.slice(0, 10);
        if (!dailyStats[day])
          dailyStats[day] = { success: 0, failure: 0, total: 0 };
        dailyStats[day].total++;
        if (r.conclusion === "success") dailyStats[day].success++;
        if (r.conclusion === "failure") dailyStats[day].failure++;
      });
      const successRateOverTime = Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, s]) => ({
          date,
          ...s,
          success_rate: s.total ? +((s.success / s.total) * 100).toFixed(1) : 0,
        }));

      // 2. Flaky workflows (succeeded on re-run after a failure, same head SHA)
      const byHeadSha: Record<string, typeof runs> = {};
      runs.forEach((r) => {
        (byHeadSha[r.head_sha] ??= []).push(r);
      });
      const flakyCommits = Object.entries(byHeadSha)
        .filter(
          ([, group]) =>
            group.some((r) => r.conclusion === "failure") &&
            group.some((r) => r.conclusion === "success"),
        )
        .map(([sha, group]) => ({
          head_sha: sha,
          runs: group.length,
          workflow: group[0]?.name,
        }));

      // 3. Avg run duration & overall success/failure counts
      const completed = runs.filter(
        (r) => r.status === "completed" && r.run_started_at,
      );
      const durations = completed.map(
        (r) =>
          (new Date(r.updated_at).getTime() -
            new Date(r.run_started_at!).getTime()) /
          60_000,
      );
      const avgDurationMin = durations.length
        ? +(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
        : null;
      const totalSuccess = runs.filter(
        (r) => r.conclusion === "success",
      ).length;
      const totalFailure = runs.filter(
        (r) => r.conclusion === "failure",
      ).length;

      // 4. Longest-running jobs (fetch jobs for the 5 slowest runs)
      const slowestRuns = [...completed]
        .sort((a, b) => {
          const dA =
            new Date(a.updated_at).getTime() -
            new Date(a.run_started_at!).getTime();
          const dB =
            new Date(b.updated_at).getTime() -
            new Date(b.run_started_at!).getTime();
          return dB - dA;
        })
        .slice(0, 5);

      const slowJobs = (
        await Promise.all(
          slowestRuns.map(async (run) => {
            const { data: jobsData } =
              await octokit.rest.actions.listJobsForWorkflowRun({
                owner,
                repo,
                run_id: run.id,
              });
            return jobsData.jobs.map((j) => ({
              run_id: run.id,
              job_name: j.name,
              status: j.conclusion,
              duration_min:
                j.started_at && j.completed_at
                  ? +(
                      (new Date(j.completed_at).getTime() -
                        new Date(j.started_at).getTime()) /
                      60_000
                    ).toFixed(1)
                  : null,
            }));
          }),
        )
      )
        .flat()
        .sort((a, b) => (b.duration_min ?? 0) - (a.duration_min ?? 0))
        .slice(0, 10);

      // 5. Queue time vs execution time (from the same jobs)
      const queueVsExec = (
        await Promise.all(
          completed.slice(0, 15).map(async (run) => {
            const { data: jobsData } =
              await octokit.rest.actions.listJobsForWorkflowRun({
                owner,
                repo,
                run_id: run.id,
              });
            const jobs = jobsData.jobs.filter(
              (j) => j.started_at && j.completed_at,
            );
            if (!jobs.length) return null;
            const queueMin = +(
              (new Date(jobs[0]!.started_at!).getTime() -
                new Date(run.created_at).getTime()) /
              60_000
            ).toFixed(1);
            const execMin = +(
              (new Date(run.updated_at).getTime() -
                new Date(jobs[0]!.started_at!).getTime()) /
              60_000
            ).toFixed(1);
            return {
              run_id: run.id,
              workflow: run.name,
              queue_min: queueMin,
              exec_min: execMin,
            };
          }),
        )
      ).filter(Boolean);

      const avgQueue = queueVsExec.length
        ? +(
            queueVsExec.reduce((s, r) => s + r!.queue_min, 0) /
            queueVsExec.length
          ).toFixed(1)
        : null;
      const avgExec = queueVsExec.length
        ? +(
            queueVsExec.reduce((s, r) => s + r!.exec_min, 0) /
            queueVsExec.length
          ).toFixed(1)
        : null;

      // 6. Deployment frequency (runs on default branch that succeeded — proxy for deploys)
      const {
        data: { default_branch: defaultBranch },
      } = await octokit.rest.repos.get({ owner, repo });
      const deployRuns = runs.filter(
        (r) =>
          r.event === "push" &&
          r.head_branch === defaultBranch &&
          r.conclusion === "success",
      );
      const deployDays = new Set(
        deployRuns.map((r) => r.created_at.slice(0, 10)),
      );
      let spanDays = 1;
      if (deployRuns.length > 1) {
        const deployTimestamps = deployRuns
          .map((r) => new Date(r.created_at).getTime())
          .filter((t) => Number.isFinite(t));
        if (deployTimestamps.length > 1) {
          const minTs = Math.min(...deployTimestamps);
          const maxTs = Math.max(...deployTimestamps);
          const msSpan = maxTs - minTs;
          const daysSpan = msSpan / 86_400_000;
          spanDays = daysSpan > 0 ? daysSpan : 1;
        }
      }
      const deployFreq = +(deployRuns.length / spanDays).toFixed(2);

      // 7. Mean time to recovery (avg time between a failure and next success on same workflow)
      const byWorkflow: Record<string, typeof runs> = {};
      runs.forEach((r) => {
        (byWorkflow[r.name ?? "unknown"] ??= []).push(r);
      });
      const recoveryTimes: number[] = [];
      Object.values(byWorkflow).forEach((wfRuns) => {
        const sorted = [...wfRuns].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        for (let i = 0; i < sorted.length - 1; i++) {
          if (
            sorted[i]!.conclusion === "failure" &&
            sorted[i + 1]!.conclusion === "success"
          ) {
            recoveryTimes.push(
              (new Date(sorted[i + 1]!.created_at).getTime() -
                new Date(sorted[i]!.created_at).getTime()) /
                60_000,
            );
          }
        }
      });
      const mttrMin = recoveryTimes.length
        ? +(
            recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
          ).toFixed(1)
        : null;

      res.json({
        summary: {
          total_runs: runs.length,
          success: totalSuccess,
          failure: totalFailure,
          avg_duration_min: avgDurationMin,
          deploy_frequency_per_day: deployFreq,
          mttr_min: mttrMin,
        },
        success_rate_over_time: successRateOverTime,
        flaky_workflows: flakyCommits,
        slowest_jobs: slowJobs,
        queue_vs_execution: {
          avg_queue_min: avgQueue,
          avg_exec_min: avgExec,
          runs: queueVsExec,
        },
        deploy_days: deployDays.size,
      });
    } catch (error) {
      console.error("GitHub Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch CI/CD metrics from GitHub" });
    }
  },
);

export default router;
