import path from "node:path";
import dotenv from "dotenv";

import cors from "cors";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

import express, { IRouter, Response } from "express";
import { authenticateToken } from "./authenticatetoken.js";
import { AuthenticatedRequest } from "./api_types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const githubToken = `${process.env.GITHUB_TOKEN}`;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

router.get(
  "/api/github/repos",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const username = req.user?.githubUsername;

      if (!username) {
        return res
          .status(400)
          .json({ error: "No GitHub username linked to this account." });
      }

      console.log(`Fetching GitHub repositories for: ${username}`);

      const { data } = await octokit.rest.repos.listForUser({
        username: username,
        type: "all",
        sort: "updated",
      });

      const simpleRepos = data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
        language: repo.language,
        updated_at: repo.updated_at,
      }));

      res.json(simpleRepos);
    } catch (error) {
      console.error(
        `GitHub Error fetching repos for ${req.user?.githubUsername}:`,
        error,
      );
      res
        .status(500)
        .json({ error: "Failed to fetch repositories from GitHub" });
    }
  },
);

router.get(
  "/api/github/repos/:owner/:repo/pulls",

  async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 5,
      });
      res.json(data);
    } catch (error) {
      console.error("GitHub Error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch pull requests from GitHub" });
    }
  },
);

router.get("/api/github/repos/:owner/:repo/actions", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 5,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch actions from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/releases", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 5,
    });

    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch releases from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 5,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch issues from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/commits", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 5,
    });
    res.json(data);
  } catch (error) {
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch commits from GitHub" });
  }
});

export default router;
