import path from "node:path";
import dotenv from "dotenv";
import express, { IRouter } from "express";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";
import { authenticateToken } from "./authenticatetoken";
import prisma from "./prisma.js";
import type { AuthenticatedRequest } from "./api_types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const sonarToken = `${process.env.SONAR_TOKEN}`;

const githubToken = `${process.env.GITHUB_TOKEN}`;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

const isValidRepoParam = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 100 &&
    /^[A-Za-z0-9_.-]+$/.test(value)
  );
};

// backend: analytics.ts (or wherever your route lives)

router.get(
  "/api/analytics/sonar/:owner/:repo",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      if (!owner || !repo) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const projectKey = `${owner}_${repo}`;

      // PHASE 2: Expanded metrics list for deeper enterprise analytics
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
        "sqale_rating", // Maintainability Rating
        "sqale_index", // Technical Debt (in minutes)
        "blocker_violations", // Severity metrics
        "critical_violations",
        "major_violations",
        "minor_violations",
        "ncloc", // Lines of code (context sizing)
      ].join(",");

      const sonarUrl = `https://sonarcloud.io/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}`;

      const response = await fetch(sonarUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(sonarToken + ":").toString("base64")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404)
          return res
            .status(404)
            .json({ error: "Project not found in SonarQube" });
        throw new Error(`Sonar API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Map the array of measures into a clean key-value object
      const metricsMap = data.component.measures.reduce(
        (acc: any, measure: any) => {
          acc[measure.metric] = measure.value;
          return acc;
        },
        {},
      );

      res.json(metricsMap);
    } catch (error) {
      console.error("SonarQube Error:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch metrics from SonarQube" });
    }
  },
);

router.get(
  "/api/analytics/sonar/:owner/:repo/issues",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      if (!owner || !repo) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const projectKey = `${owner}_${repo}`;
      const pageSize = 100;
      const maxPages = 3;
      const allIssues: Array<{
        key: string;
        rule?: string;
        severity?: string;
        type?: string;
        message?: string;
        component?: string;
        line?: number;
        status?: string;
        effort?: string;
        creationDate?: string;
        updateDate?: string;
        tags?: string[];
      }> = [];

      for (let page = 1; page <= maxPages; page++) {
        const query = new URLSearchParams({
          componentKeys: projectKey,
          resolved: "false",
          severities: "BLOCKER,CRITICAL,MAJOR,MINOR,INFO",
          // Sonar issues API supports BUG, VULNERABILITY, CODE_SMELL.
          // Security hotspots are fetched from /hotspots/search below.
          types: "BUG,VULNERABILITY,CODE_SMELL",
          p: String(page),
          ps: String(pageSize),
        });

        const issuesUrl = `https://sonarcloud.io/api/issues/search?${query.toString()}`;
        const response = await fetch(issuesUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(sonarToken + ":").toString("base64")}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return res
              .status(404)
              .json({ error: "Project issues not found in SonarQube" });
          }
          throw new Error(`Sonar issues API error: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          total?: number;
          paging?: { total?: number };
          issues?: Array<{
            key: string;
            rule?: string;
            severity?: string;
            type?: string;
            message?: string;
            component?: string;
            line?: number;
            status?: string;
            effort?: string;
            creationDate?: string;
            updateDate?: string;
            tags?: string[];
          }>;
        };

        const issues = data.issues ?? [];
        allIssues.push(...issues);

        const total = data.paging?.total ?? data.total ?? issues.length;
        if (page * pageSize >= total || issues.length === 0) {
          break;
        }
      }

      // Fetch security hotspots from dedicated Sonar endpoint.
      // If unavailable for a project/tier, continue without failing the whole deep-dive API.
      try {
        for (let page = 1; page <= maxPages; page++) {
          const hotspotQuery = new URLSearchParams({
            projectKey,
            p: String(page),
            ps: String(pageSize),
            status: "TO_REVIEW,REVIEWED",
          });

          const hotspotsUrl = `https://sonarcloud.io/api/hotspots/search?${hotspotQuery.toString()}`;
          const hotspotResponse = await fetch(hotspotsUrl, {
            headers: {
              Authorization: `Basic ${Buffer.from(sonarToken + ":").toString("base64")}`,
            },
          });

          if (!hotspotResponse.ok) {
            break;
          }

          const hotspotData = (await hotspotResponse.json()) as {
            paging?: { total?: number };
            hotspots?: Array<{
              key: string;
              rule?: { key?: string } | string;
              vulnerabilityProbability?: "HIGH" | "MEDIUM" | "LOW";
              message?: string;
              component?: string;
              line?: number;
              status?: string;
              creationDate?: string;
              updateDate?: string;
            }>;
          };

          const hotspots = hotspotData.hotspots ?? [];
          if (hotspots.length === 0) {
            break;
          }

          const mappedHotspots = hotspots.map((hotspot) => {
            const probability = hotspot.vulnerabilityProbability ?? "LOW";
            const severity =
              probability === "HIGH"
                ? "CRITICAL"
                : probability === "MEDIUM"
                  ? "MAJOR"
                  : "MINOR";

            const ruleKey =
              typeof hotspot.rule === "string"
                ? hotspot.rule
                : hotspot.rule?.key;

            return {
              key: hotspot.key,
              rule: ruleKey,
              severity,
              type: "SECURITY_HOTSPOT",
              message: hotspot.message,
              component: hotspot.component,
              line: hotspot.line,
              status: hotspot.status,
              creationDate: hotspot.creationDate,
              updateDate: hotspot.updateDate,
            };
          });

          allIssues.push(...mappedHotspots);

          const totalHotspots = hotspotData.paging?.total ?? hotspots.length;
          if (page * pageSize >= totalHotspots) {
            break;
          }
        }
      } catch (hotspotError) {
        console.warn("SonarQube hotspots fetch warning:", hotspotError);
      }

      const severityOrder = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"];
      const typeOrder = [
        "VULNERABILITY",
        "BUG",
        "SECURITY_HOTSPOT",
        "CODE_SMELL",
      ];

      const bySeverity = allIssues.reduce<Record<string, number>>(
        (acc, issue) => {
          const severity = issue.severity ?? "UNKNOWN";
          acc[severity] = (acc[severity] ?? 0) + 1;
          return acc;
        },
        {},
      );

      const byType = allIssues.reduce<Record<string, number>>((acc, issue) => {
        const type = issue.type ?? "UNKNOWN";
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {});

      const topFiles = Object.entries(
        allIssues.reduce<Record<string, number>>((acc, issue) => {
          const file = issue.component ?? "unknown";
          acc[file] = (acc[file] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([component, count]) => ({ component, count }));

      const topRules = Object.entries(
        allIssues.reduce<Record<string, number>>((acc, issue) => {
          const rule = issue.rule ?? "unknown-rule";
          acc[rule] = (acc[rule] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([rule, count]) => ({ rule, count }));

      const sortedIssues = [...allIssues].sort((a, b) => {
        const severityDiff =
          severityOrder.indexOf(a.severity ?? "INFO") -
          severityOrder.indexOf(b.severity ?? "INFO");
        if (severityDiff !== 0) return severityDiff;

        const typeDiff =
          typeOrder.indexOf(a.type ?? "CODE_SMELL") -
          typeOrder.indexOf(b.type ?? "CODE_SMELL");
        if (typeDiff !== 0) return typeDiff;

        const aDate = new Date(a.creationDate ?? 0).getTime();
        const bDate = new Date(b.creationDate ?? 0).getTime();
        return bDate - aDate;
      });

      return res.json({
        total: sortedIssues.length,
        bySeverity,
        byType,
        topFiles,
        topRules,
        issues: sortedIssues,
      });
    } catch (error) {
      console.error("SonarQube Issues Error:", error);
      return res.status(500).json({
        error: "Failed to fetch issue-level insights from SonarQube",
      });
    }
  },
);
// Developer Velocity — single endpoint for PR quality & health metrics
// backend: analytics.ts (or wherever your routes are defined)

router.get(
  "/api/analytics/velocity/:owner/:repo",
  authenticateToken,
  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const days = Number.parseInt(req.query.days as string, 10) || 30;
      const now = Date.now();
      const cutoffDate = new Date(now - days * 86_400_000);
      const STALE_MS = 14 * 86_400_000;
      const LONG_LIVED_MS = 7 * 86_400_000;

      const average = (nums: number[]) => {
        if (nums.length === 0) return null;
        return +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
      };

      const median = (nums: number[]) => {
        if (nums.length === 0) return null;
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
          return +(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2).toFixed(
            1,
          );
        }
        return +(sorted[mid] ?? 0).toFixed(1);
      };

      const buildDateSeries = (startDate: Date, spanDays: number) => {
        const keys: string[] = [];
        for (let i = 0; i < spanDays; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          keys.push(d.toISOString().slice(0, 10));
        }
        return keys;
      };

      if (
        !owner ||
        typeof owner !== "string" ||
        !repo ||
        typeof repo !== "string"
      ) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const [{ data: openPRs }, { data: closedPRs }] = await Promise.all([
        octokit.rest.pulls.list({ owner, repo, state: "open", per_page: 100 }),
        octokit.rest.pulls.list({
          owner,
          repo,
          state: "closed",
          sort: "updated",
          direction: "desc",
          per_page: 100,
        }),
      ]);

      const recentClosed = closedPRs.filter(
        (pr) => new Date(pr.updated_at) >= cutoffDate,
      );
      const mergedPRs = recentClosed.filter((pr) => pr.merged_at);

      const throughputMap: Record<string, number> = {};
      mergedPRs.forEach((pr) => {
        const dateStr = new Date(pr.merged_at!).toISOString().split("T")[0];
        if (!dateStr) {
          return res.status(400).json({ error: "Invalid date parameter" });
        }
        throughputMap[dateStr] = (throughputMap[dateStr] || 0) + 1;
      });

      const throughput = buildDateSeries(cutoffDate, days).map((date) => ({
        date,
        count: throughputMap[date] ?? 0,
      }));

      const reviewerCounts: Record<string, number> = {};
      const reviewerApprovedCounts: Record<string, number> = {};

      type ReviewStat = {
        number: number;
        title: string;
        url: string;
        author: string | null;
        base_branch: string;
        head_branch: string;
        additions: number;
        deletions: number;
        changed_files: number;
        commits: number;
        comments: number;
        review_comments: number;
        review_count: number;
        approvals: number;
        created_at: string;
        merged_at: string;
        time_to_first_review_h: number | null;
        time_to_merge_h: number;
      };

      const reviewStats = await Promise.all(
        mergedPRs.slice(0, 30).map(async (pr): Promise<ReviewStat | null> => {
          try {
            const [{ data: reviews }, { data: fullPr }] = await Promise.all([
              octokit.rest.pulls.listReviews({
                owner,
                repo,
                pull_number: pr.number,
                per_page: 50,
              }),
              octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: pr.number,
              }),
            ]);

            const validReviews = reviews.filter(
              (r) => r.user?.id !== pr.user?.id,
            );
            const approvals = validReviews.filter(
              (r) => r.state === "APPROVED",
            ).length;

            validReviews.forEach((r) => {
              if (r.user?.login) {
                reviewerCounts[r.user.login] =
                  (reviewerCounts[r.user.login] || 0) + 1;
                if (r.state === "APPROVED") {
                  reviewerApprovedCounts[r.user.login] =
                    (reviewerApprovedCounts[r.user.login] || 0) + 1;
                }
              }
            });

            const firstReview = validReviews.sort(
              (a, b) =>
                new Date(a.submitted_at!).getTime() -
                new Date(b.submitted_at!).getTime(),
            )[0];

            const created = new Date(pr.created_at).getTime();

            return {
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              author: pr.user?.login ?? null,
              base_branch: fullPr.base.ref,
              head_branch: fullPr.head.ref,
              additions: fullPr.additions,
              deletions: fullPr.deletions,
              changed_files: fullPr.changed_files,
              commits: fullPr.commits,
              comments: fullPr.comments,
              review_comments: fullPr.review_comments,
              review_count: validReviews.length,
              approvals,
              created_at: fullPr.created_at,
              merged_at: fullPr.merged_at ?? pr.merged_at!,
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
          } catch (error) {
            console.error("GitHub Review Insights Error:", error);
            return null;
          }
        }),
      );

      const validReviewStats = reviewStats.filter(Boolean) as ReviewStat[];
      const reviewStatsByNumber = new Map(
        validReviewStats.map((entry) => [entry.number, entry]),
      );

      const reviewTimes = validReviewStats
        .map((r) => r.time_to_first_review_h)
        .filter((v): v is number => v !== null);
      const mergeTimes = validReviewStats
        .map((r) => r.time_to_merge_h)
        .filter((v): v is number => v !== null);

      const reviewCoveragePct = validReviewStats.length
        ? +(
            (validReviewStats.filter((r) => r.review_count > 0).length /
              validReviewStats.length) *
            100
          ).toFixed(1)
        : 0;

      const unreviewedMergedCount = validReviewStats.filter(
        (r) => r.review_count === 0,
      ).length;
      const avgPrChanges = average(
        validReviewStats.map((r) => r.additions + r.deletions),
      );
      const highReworkMergedCount = validReviewStats.filter(
        (r) => r.commits >= 6,
      ).length;
      const reviewSlaBreaches = validReviewStats.filter(
        (r) => (r.time_to_first_review_h ?? 0) > 48,
      ).length;

      const top_reviewers = Object.entries(reviewerCounts)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const reviewer_approvals = Object.entries(reviewerApprovedCounts)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const sizeOf = (c: number) => {
        if (c < 10) return "XS";
        if (c < 50) return "S";
        if (c < 250) return "M";
        if (c < 1000) return "L";
        return "XL";
      };

      const allRecentPRs = [...openPRs, ...recentClosed].slice(0, 60);
      const detailedRecentPRs = (
        await Promise.all(
          allRecentPRs.map(async (pr) => {
            try {
              const { data } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: pr.number,
              });
              return data;
            } catch (error) {
              console.warn(
                `Failed to fetch PR details for #${pr.number} in ${owner}/${repo}`,
                error,
              );
              return null;
            }
          }),
        )
      ).filter(
        (
          pr,
        ): pr is Awaited<
          ReturnType<typeof octokit.rest.pulls.get>
        >["data"] => pr !== null,
      );

      const sizes = detailedRecentPRs.map((pr) =>
        sizeOf(pr.additions + pr.deletions),
      );
      const sizeDistribution = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
      sizes.forEach(
        (s) => sizeDistribution[s as keyof typeof sizeDistribution]++,
      );

      const branchActivity = Object.entries(
        detailedRecentPRs.reduce<Record<string, number>>((acc, pr) => {
          const branch = pr.base.ref;
          acc[branch] = (acc[branch] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([branch, prs]) => ({ branch, prs }));

      const activeBranchLoad = Object.entries(
        openPRs.reduce<Record<string, number>>((acc, pr) => {
          const branch = pr.base.ref;
          acc[branch] = (acc[branch] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .map(([branch, open_prs]) => ({ branch, open_prs }));

      const riskScore = (pr: {
        additions: number;
        deletions: number;
        commits: number;
        changed_files: number;
        draft?: boolean;
        review_count?: number;
      }) => {
        let score = 0;
        const totalChanges = pr.additions + pr.deletions;
        if (totalChanges >= 1000) score += 3;
        else if (totalChanges >= 500) score += 2;
        else if (totalChanges >= 250) score += 1;
        if (pr.changed_files >= 40) score += 2;
        else if (pr.changed_files >= 20) score += 1;
        if (pr.commits >= 10) score += 2;
        else if (pr.commits >= 6) score += 1;
        if ((pr.review_count ?? 0) === 0) score += 2;
        if (pr.draft) score += 1;
        return score;
      };

      const prRegister = detailedRecentPRs
        .map((pr) => {
          const mergedStats = reviewStatsByNumber.get(pr.number);
          const createdAt = new Date(pr.created_at).getTime();
          const updatedAt = new Date(pr.updated_at).getTime();
          const ageDays = Math.max(0, Math.round((now - createdAt) / 86_400_000));
          const totalChanges = pr.additions + pr.deletions;
          const reviews = mergedStats?.review_count ?? 0;
          const score = riskScore({
            additions: pr.additions,
            deletions: pr.deletions,
            commits: pr.commits,
            changed_files: pr.changed_files,
            draft: pr.draft,
            review_count: reviews,
          });

          const riskLevel = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
          const state = pr.merged_at ? "merged" : pr.state;

          return {
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            author: pr.user?.login ?? null,
            state,
            is_draft: pr.draft,
            base_branch: pr.base.ref,
            head_branch: pr.head.ref,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            age_days: ageDays,
            additions: pr.additions,
            deletions: pr.deletions,
            total_changes: totalChanges,
            changed_files: pr.changed_files,
            commits: pr.commits,
            comments: pr.comments,
            review_comments: pr.review_comments,
            review_count: reviews,
            approvals: mergedStats?.approvals ?? 0,
            time_to_first_review_h: mergedStats?.time_to_first_review_h ?? null,
            time_to_merge_h: mergedStats?.time_to_merge_h ?? null,
            risk_score: score,
            risk_level: riskLevel,
            stale_days:
              state === "open"
                ? +((now - updatedAt) / 86_400_000).toFixed(0)
                : 0,
          };
        })
        .sort((a, b) => {
          if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

      const risk_prs = prRegister.slice(0, 10);

      const qualitySignals = {
        unreviewed_merged_count: unreviewedMergedCount,
        high_rework_merged_count: highReworkMergedCount,
        review_sla_breaches: reviewSlaBreaches,
        long_lived_open_prs: openPRs.filter(
          (pr) => now - new Date(pr.created_at).getTime() > LONG_LIVED_MS,
        ).length,
        draft_open_prs: openPRs.filter((pr) => pr.draft).length,
      };

      const toBucketLabel = (hours: number, type: "review" | "lead") => {
        if (type === "review") {
          if (hours < 4) return "<4h";
          if (hours < 24) return "4-24h";
          if (hours < 72) return "1-3d";
          return ">3d";
        }
        if (hours < 24) return "<1d";
        if (hours < 72) return "1-3d";
        if (hours < 168) return "3-7d";
        return ">7d";
      };

      const reviewResponseBucketsMap: Record<string, number> = {
        "<4h": 0,
        "4-24h": 0,
        "1-3d": 0,
        ">3d": 0,
      };
      reviewTimes.forEach((value) => {
        const bucket = toBucketLabel(value, "review");
        reviewResponseBucketsMap[bucket] =
          (reviewResponseBucketsMap[bucket] ?? 0) + 1;
      });
      const review_response_buckets = Object.entries(reviewResponseBucketsMap).map(
        ([label, count]) => ({ label, count }),
      );

      const leadTimeBucketsMap: Record<string, number> = {
        "<1d": 0,
        "1-3d": 0,
        "3-7d": 0,
        ">7d": 0,
      };
      mergeTimes.forEach((value) => {
        const bucket = toBucketLabel(value, "lead");
        leadTimeBucketsMap[bucket] = (leadTimeBucketsMap[bucket] ?? 0) + 1;
      });
      const lead_time_buckets = Object.entries(leadTimeBucketsMap).map(
        ([label, count]) => ({ label, count }),
      );

      const branchMergeStats = Object.entries(
        validReviewStats.reduce<
          Record<
            string,
            { count: number; reviewTimes: number[]; mergeTimes: number[] }
          >
        >((acc, item) => {
          const key = item.base_branch;
          if (!acc[key]) {
            acc[key] = { count: 0, reviewTimes: [], mergeTimes: [] };
          }
          acc[key]!.count += 1;
          if (item.time_to_first_review_h !== null) {
            acc[key]!.reviewTimes.push(item.time_to_first_review_h);
          }
          acc[key]!.mergeTimes.push(item.time_to_merge_h);
          return acc;
        }, {}),
      )
        .map(([branch, data]) => ({
          branch,
          merged_prs: data.count,
          avg_review_h: average(data.reviewTimes),
          avg_merge_h: average(data.mergeTimes),
        }))
        .sort((a, b) => b.merged_prs - a.merged_prs)
        .slice(0, 8);

      const stale_prs = openPRs
        .filter((pr) => now - new Date(pr.updated_at).getTime() > STALE_MS)
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login,
          days_stale: +(
            (now - new Date(pr.updated_at).getTime()) /
            86_400_000
          ).toFixed(0),
        }));

      const merge_conflicts = await Promise.all(
        openPRs.slice(0, 30).map(async (pr) => {
          try {
            const { data } = await octokit.rest.pulls.get({
              owner,
              repo,
              pull_number: pr.number,
            });
            return data.mergeable_state === "dirty"
              ? {
                  number: data.number,
                  title: data.title,
                  url: data.html_url,
                  author: data.user?.login,
                }
              : null;
          } catch (error) {
            console.warn(
              `Failed to fetch mergeability for PR #${pr.number} in ${owner}/${repo}`,
              error,
            );
            return null;
          }
        }),
      );

      const reviewStatsChronological = validReviewStats.toReversed();

      res.json({
        timeframe_days: days,
        summary: {
          open_prs: openPRs.length,
          merged_prs: mergedPRs.length,
          closed_unmerged_prs: recentClosed.length - mergedPRs.length,
          review_coverage_pct: reviewCoveragePct,
          avg_pr_changes: avgPrChanges,
          median_first_review_h: median(reviewTimes),
          median_merge_h: median(mergeTimes),
        },
        review_time: {
          avg_first_review_h: average(reviewTimes),
          avg_merge_h: average(mergeTimes),
          prs: reviewStatsChronological,
        },
        throughput,
        top_reviewers,
        reviewer_approvals,
        pr_size_distribution: sizeDistribution,
        branch_activity: branchActivity,
        branch_merge_stats: branchMergeStats,
        active_branch_load: activeBranchLoad,
        review_response_buckets,
        lead_time_buckets,
        quality_signals: qualitySignals,
        risk_prs,
        pr_register: prRegister,
        stale_prs,
        merge_conflicts: merge_conflicts.filter(Boolean),
      });
    } catch (error) {
      console.error("Velocity Analytics Error:", error);
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
      const days = Number.parseInt(req.query.days as string, 10) || 30;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const createdDate = cutoffDate.toISOString().split("T")[0];
      const createdFilter = `>=${createdDate}`;

      if (
        !owner ||
        typeof owner !== "string" ||
        !repo ||
        typeof repo !== "string"
      ) {
        return res
          .status(400)
          .json({ error: "Invalid owner or repo parameter" });
      }

      const safeAvg = (values: number[]) => {
        if (values.length === 0) return null;
        return +(values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(
          1,
        );
      };

      const { data: runsData } = await octokit.rest.actions.listWorkflowRunsForRepo(
        {
          owner,
          repo,
          per_page: 100,
          created: createdFilter,
        },
      );

      const runs = runsData.workflow_runs;

      const runRegister = runs
        .map((run) => {
          const queueMin = run.run_started_at
            ? +(
                (new Date(run.run_started_at).getTime() -
                  new Date(run.created_at).getTime()) /
                60_000
              ).toFixed(1)
            : null;

          const execMin = run.run_started_at
            ? +(
                (new Date(run.updated_at).getTime() -
                  new Date(run.run_started_at).getTime()) /
                60_000
              ).toFixed(1)
            : null;

          return {
            run_id: run.id,
            workflow: run.name ?? "Unknown Workflow",
            branch: run.head_branch ?? "unknown",
            event: run.event,
            status: run.status,
            conclusion: run.conclusion,
            actor: run.actor?.login ?? null,
            queue_min: queueMin !== null ? Math.max(0, queueMin) : null,
            exec_min: execMin !== null ? Math.max(0, execMin) : null,
            duration_min: execMin !== null ? Math.max(0, execMin) : null,
            created_at: run.created_at,
            updated_at: run.updated_at,
            url: run.html_url,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      const dailyStats: Record<
        string,
        { success: number; failure: number; total: number }
      > = {};

      for (let i = days - 1; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        dailyStats[day.toISOString().slice(0, 10)] = {
          success: 0,
          failure: 0,
          total: 0,
        };
      }

      runs.forEach((run) => {
        const day = run.created_at.slice(0, 10);
        if (!dailyStats[day]) return;
        dailyStats[day].total += 1;
        if (run.conclusion === "success") dailyStats[day].success += 1;
        if (
          run.conclusion === "failure" ||
          run.conclusion === "timed_out" ||
          run.conclusion === "cancelled"
        ) {
          dailyStats[day].failure += 1;
        }
      });

      const successRateOverTime = Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          total: stats.total,
          success_rate: stats.total
            ? +((stats.success / stats.total) * 100).toFixed(1)
            : 0,
        }));

      const byHeadSha: Record<string, typeof runs> = {};
      runs.forEach((run) => {
        (byHeadSha[run.head_sha] ??= []).push(run);
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
          url: group[0]?.html_url,
        }));

      const completedRuns = runRegister.filter((r) => r.duration_min !== null);
      const totalSuccess = runs.filter((r) => r.conclusion === "success").length;
      const totalFailure = runs.filter((r) => r.conclusion === "failure").length;

      const slowestRuns = [...completedRuns]
        .sort((a, b) => (b.duration_min ?? 0) - (a.duration_min ?? 0))
        .slice(0, 5);

      const slowJobs = (
        await Promise.all(
          slowestRuns.map(async (run) => {
            try {
              const { data: jobsData } =
                await octokit.rest.actions.listJobsForWorkflowRun({
                  owner,
                  repo,
                  run_id: run.run_id,
                });

              return jobsData.jobs.map((job) => ({
                run_id: run.run_id,
                workflow: run.workflow,
                branch: run.branch,
                job_name: job.name,
                status: job.conclusion,
                url: job.html_url,
                duration_min:
                  job.started_at && job.completed_at
                    ? +(
                        (new Date(job.completed_at).getTime() -
                          new Date(job.started_at).getTime()) /
                        60_000
                      ).toFixed(1)
                    : null,
              }));
            } catch (error) {
              console.warn("Failed to fetch workflow jobs", {
                owner,
                repo,
                runId: run.run_id,
                error,
              });
              return [];
            }
          }),
        )
      )
        .flat()
        .sort((a, b) => (b.duration_min ?? 0) - (a.duration_min ?? 0))
        .slice(0, 12);

      const queueVsExec = runRegister
        .filter((run) => run.queue_min !== null && run.exec_min !== null)
        .slice(0, 20)
        .map((run) => ({
          run_id: run.run_id,
          workflow: run.workflow,
          queue_min: run.queue_min,
          exec_min: run.exec_min,
        }));

      const avgQueue = safeAvg(
        queueVsExec
          .map((run) => run.queue_min)
          .filter((value): value is number => value !== null),
      );

      const avgExec = safeAvg(
        queueVsExec
          .map((run) => run.exec_min)
          .filter((value): value is number => value !== null),
      );

      const workflowBreakdown = Object.entries(
        runRegister.reduce<
          Record<
            string,
            {
              total: number;
              success: number;
              failure: number;
              durations: number[];
              queue: number[];
              last_run_at: string;
            }
          >
        >((acc, run) => {
          const key = run.workflow;
          if (!acc[key]) {
            acc[key] = {
              total: 0,
              success: 0,
              failure: 0,
              durations: [],
              queue: [],
              last_run_at: run.created_at,
            };
          }
          acc[key].total += 1;
          if (run.conclusion === "success") acc[key].success += 1;
          if (
            run.conclusion === "failure" ||
            run.conclusion === "timed_out" ||
            run.conclusion === "cancelled"
          ) {
            acc[key].failure += 1;
          }
          if (run.duration_min !== null) acc[key].durations.push(run.duration_min);
          if (run.queue_min !== null) acc[key].queue.push(run.queue_min);
          if (
            new Date(run.created_at).getTime() >
            new Date(acc[key].last_run_at).getTime()
          ) {
            acc[key].last_run_at = run.created_at;
          }
          return acc;
        }, {}),
      )
        .map(([workflow, data]) => ({
          workflow,
          total_runs: data.total,
          success_rate: data.total
            ? +((data.success / data.total) * 100).toFixed(1)
            : 0,
          failure_rate: data.total
            ? +((data.failure / data.total) * 100).toFixed(1)
            : 0,
          avg_duration_min: safeAvg(data.durations),
          avg_queue_min: safeAvg(data.queue),
          last_run_at: data.last_run_at,
        }))
        .sort((a, b) => b.total_runs - a.total_runs)
        .slice(0, 10);

      const branchBreakdown = Object.entries(
        runRegister.reduce<
          Record<
            string,
            { total: number; success: number; failure: number; durations: number[] }
          >
        >((acc, run) => {
          const key = run.branch || "unknown";
          if (!acc[key]) {
            acc[key] = { total: 0, success: 0, failure: 0, durations: [] };
          }
          acc[key].total += 1;
          if (run.conclusion === "success") acc[key].success += 1;
          if (
            run.conclusion === "failure" ||
            run.conclusion === "timed_out" ||
            run.conclusion === "cancelled"
          ) {
            acc[key].failure += 1;
          }
          if (run.duration_min !== null) acc[key].durations.push(run.duration_min);
          return acc;
        }, {}),
      )
        .map(([branch, data]) => ({
          branch,
          total_runs: data.total,
          success_rate: data.total
            ? +((data.success / data.total) * 100).toFixed(1)
            : 0,
          failure_rate: data.total
            ? +((data.failure / data.total) * 100).toFixed(1)
            : 0,
          avg_duration_min: safeAvg(data.durations),
        }))
        .sort((a, b) => b.total_runs - a.total_runs)
        .slice(0, 8);

      const conclusionBreakdown = Object.entries(
        runs.reduce<Record<string, number>>((acc, run) => {
          const bucket =
            run.conclusion ?? (run.status === "completed" ? "unknown" : "in_progress");
          acc[bucket] = (acc[bucket] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([conclusion, count]) => ({ conclusion, count }))
        .sort((a, b) => b.count - a.count);

      const failureReasons = conclusionBreakdown.filter((entry) =>
        ["failure", "timed_out", "cancelled", "action_required", "startup_failure"].includes(entry.conclusion),
      );

      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;
      const deployRuns = runs.filter(
        (run) => run.head_branch === defaultBranch && run.conclusion === "success",
      );
      const deployFreq = +(deployRuns.length / days).toFixed(2);

      const groupedByWorkflow: Record<string, typeof runs> = {};
      runs.forEach((run) => {
        (groupedByWorkflow[run.name ?? "unknown"] ??= []).push(run);
      });

      const recoveryTimes: number[] = [];
      Object.values(groupedByWorkflow).forEach((groupRuns) => {
        const sorted = [...groupRuns].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        for (let index = 0; index < sorted.length - 1; index++) {
          if (
            sorted[index]?.conclusion === "failure" &&
            sorted[index + 1]?.conclusion === "success"
          ) {
            recoveryTimes.push(
              (new Date(sorted[index + 1]!.created_at).getTime() -
                new Date(sorted[index]!.created_at).getTime()) /
                60_000,
            );
          }
        }
      });

      const queueSlaBreachCount = runRegister.filter(
        (run) => (run.queue_min ?? 0) > 10,
      ).length;

      const longRunningCount = runRegister.filter(
        (run) => (run.duration_min ?? 0) > 20,
      ).length;

      res.json({
        timeframe_days: days,
        summary: {
          total_runs: runs.length,
          success: totalSuccess,
          failure: totalFailure,
          change_failure_rate: runs.length
            ? +((totalFailure / runs.length) * 100).toFixed(1)
            : 0,
          avg_duration_min: safeAvg(
            completedRuns
              .map((run) => run.duration_min)
              .filter((value): value is number => value !== null),
          ),
          deploy_frequency_per_day: deployFreq,
          mttr_min: safeAvg(recoveryTimes),
          queue_sla_breach_count: queueSlaBreachCount,
          long_running_count: longRunningCount,
          flaky_commit_count: flakyCommits.length,
        },
        success_rate_over_time: successRateOverTime,
        flaky_workflows: flakyCommits,
        slowest_jobs: slowJobs,
        queue_vs_execution: {
          avg_queue_min: avgQueue,
          avg_exec_min: avgExec,
          runs: queueVsExec,
        },
        workflow_breakdown: workflowBreakdown,
        branch_breakdown: branchBreakdown,
        conclusion_breakdown: conclusionBreakdown,
        failure_reasons: failureReasons,
        run_register: runRegister,
      });
    } catch (error) {
      console.error("CICD Analytics Error:", error);
      res.status(500).json({ error: "Failed to fetch CI/CD metrics" });
    }
  },
);

// ─── Provider Integration Management ──────────────────────────────────────────

// GET /api/integrations/status  — which providers are connected for the auth'd user
router.get(
  "/api/integrations/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const rows = await prisma.providerIntegration.findMany({
        where: { userId },
        select: { provider: true, teamId: true, connectedAt: true },
      });
      const result: Record<
        string,
        {
          connected: boolean;
          connectedAt: string | null;
          teamId: string | null;
        }
      > = {
        vercel: { connected: false, connectedAt: null, teamId: null },
        render: { connected: false, connectedAt: null, teamId: null },
      };
      rows.forEach((r) => {
        result[r.provider] = {
          connected: true,
          connectedAt: r.connectedAt.toISOString(),
          teamId: r.teamId ?? null,
        };
      });
      res.json(result);
    } catch (err) {
      console.error("Integration status error:", err);
      res.status(500).json({ error: "Failed to fetch integration status" });
    }
  },
);

// POST /api/integrations/:provider/connect  — save API token for a provider
router.post(
  "/api/integrations/:provider/connect",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { provider } = req.params;
      if (provider !== "vercel" && provider !== "render") {
        return res
          .status(400)
          .json({ error: "Unsupported provider. Use 'vercel' or 'render'." });
      }
      const { apiToken, teamId } = req.body as {
        apiToken?: string;
        teamId?: string;
      };
      if (
        !apiToken ||
        typeof apiToken !== "string" ||
        apiToken.trim().length < 10
      ) {
        return res
          .status(400)
          .json({ error: "A valid API token is required." });
      }

      // Validate the token by making a lightweight call to the provider
      if (provider === "vercel") {
        const testRes = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${apiToken.trim()}` },
        });
        if (!testRes.ok) {
          return res
            .status(401)
            .json({ error: "Vercel token is invalid or lacks permissions." });
        }
      } else {
        const testRes = await fetch(
          "https://api.render.com/v1/services?limit=1",
          {
            headers: {
              Authorization: `Bearer ${apiToken.trim()}`,
              Accept: "application/json",
            },
          },
        );
        if (!testRes.ok) {
          return res
            .status(401)
            .json({ error: "Render API key is invalid or lacks permissions." });
        }
      }

      await prisma.providerIntegration.upsert({
        where: { userId_provider: { userId: req.user!.id, provider } },
        create: {
          userId: req.user!.id,
          provider,
          apiToken: apiToken.trim(),
          teamId: teamId ?? null,
        },
        update: {
          apiToken: apiToken.trim(),
          teamId: teamId ?? null,
          connectedAt: new Date(),
        },
      });

      res.json({ connected: true, provider });
    } catch (err) {
      console.error("Integration connect error:", err);
      res.status(500).json({ error: "Failed to save integration" });
    }
  },
);

// DELETE /api/integrations/:provider/disconnect  — remove a provider's token
router.delete(
  "/api/integrations/:provider/disconnect",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { provider } = req.params;
      const providerStr = Array.isArray(provider) ? provider[0] : provider;
      await prisma.providerIntegration.deleteMany({
        where: { userId: req.user!.id, provider: providerStr },
      });
      res.json({ disconnected: true, provider });
    } catch (err) {
      console.error("Integration disconnect error:", err);
      res.status(500).json({ error: "Failed to disconnect integration" });
    }
  },
);

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
    repo: string;
    type: string;
  };
}

interface RenderDeploy {
  deploy: {
    id: string;
    status: string;
    createdAt: string;
    finishedAt: string | null;
    commit: { id: string; message: string } | null;
  };
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
  // Get all services and find those that match the repo
  const svcRes = await fetch("https://api.render.com/v1/services?limit=20", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });
  if (!svcRes.ok) throw new Error(`Render services API error ${svcRes.status}`);
  const services = (await svcRes.json()) as RenderService[];

  const repoSuffix = `${owner}/${repo}`.toLowerCase();
  const matchingServices = services.filter((s) =>
    s.service.repo.toLowerCase().includes(repoSuffix),
  );

  if (matchingServices.length === 0) return [];

  const allDeploys: NormalisedDeployment[] = [];

  await Promise.all(
    matchingServices.map(async (svc) => {
      const dRes = await fetch(
        `https://api.render.com/v1/deploys?serviceId=${svc.service.id}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: "application/json",
          },
        },
      );
      if (!dRes.ok) return;
      const deploys = (await dRes.json()) as RenderDeploy[];

      deploys.forEach(({ deploy: d }) => {
        if (new Date(d.createdAt) < since) return;
        const start = new Date(d.createdAt);
        const end = d.finishedAt ? new Date(d.finishedAt) : null;
        allDeploys.push({
          id: d.id,
          provider: "render",
          environment: "production", // Render services are typically production
          status: mapRenderStatus(d.status),
          branch: "main", // Render doesn't surface branch per-deploy easily
          commitMessage: d.commit?.message ?? null,
          commitSha: d.commit?.id ?? null,
          startedAt: start.toISOString(),
          finishedAt: end?.toISOString() ?? null,
          durationSec: end
            ? Math.round((end.getTime() - start.getTime()) / 1000)
            : null,
          url: null,
        });
      });
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
          branchMap[d.branch] = { total: 0, success: 0, failed: 0, durations: [] };
        branchMap[d.branch]!.total++;
        if (d.status === "success") branchMap[d.branch]!.success++;
        if (d.status === "failed") branchMap[d.branch]!.failed++;
        if (d.durationSec !== null) branchMap[d.branch]!.durations.push(d.durationSec);
      });
      const branchActivity = Object.entries(branchMap)
        .map(([branch, s]) => ({
          branch,
          total: s.total,
          success: s.success,
          failed: s.failed,
          successRate: s.total > 0 ? +((s.success / s.total) * 100).toFixed(1) : 0,
          avgDurationSec:
            s.durations.length > 0
              ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
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
        .slice(0, 8);

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
          (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
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
      const recentHalf = allDeploys.filter((d) => new Date(d.startedAt) >= midpoint).length;
      const olderHalf = allDeploys.filter((d) => new Date(d.startedAt) < midpoint).length;
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
