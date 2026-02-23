import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { Octokit } from "octokit";
import { IRouter } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const githubToken = `${process.env.GITHUB_TOKEN}`;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

router.get("/api/github/repos", async (req, res) => {
  try {
    // Fetch repos for the authenticated user
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: "all",
      sort: "updated",
      per_page: 10,
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
    console.error("GitHub Error:", error);
    res.status(500).json({ error: "Failed to fetch from GitHub" });
  }
});

router.get("/api/github/repos/:owner/:repo/pulls", async (req, res) => {
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
});

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

router.get("/api/github/repos/:owner/:repo/workflow", async (req, res) => {
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
    res
      .status(500)
      .json({ error: "Failed to fetch workflow runs from GitHub" });
  }
});

export default router;
