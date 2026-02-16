import path from "path";
import dotenv from "dotenv";
import express from "express";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import cors from "cors";
import { CreateTemplateRequest } from "./api_types/index";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "url";
import { Octokit } from "octokit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;
const githubToken = `${process.env.GITHUB_TOKEN}`;
console.log(githubToken);

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// import { withAccelerate } from "@prisma/extension-accelerate";

// const accelerateUrl = `${process.env.DATABASE_URL}`;
// const accelerateUrl = `${process.env.TCP_DATABASE_URL}`;

// const prisma = new PrismaClient({
//   accelerateUrl,
// }).$extends(withAccelerate());

const octokit = new Octokit({
  auth: githubToken,
});

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/projects", async (req, res) => {
  const projects = await prisma.project.findMany();
  res.json(projects);
});

// SCAFFOLDER API ENDPOINTS //

app.get("/api/_dbinfo", async (req, res) => {
  try {
    const rows = await prisma.$queryRaw<
      {
        db: string;
        schema: string;
        user: string;
        host: string | null;
        port: number | null;
      }[]
    >`
      select
        current_database() as db,
        current_schema() as schema,
        current_user as user,
        inet_server_addr()::text as host,
        inet_server_port() as port
    `;
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "DBINFO failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    res.status(500).json({
      error: "Internal Server Error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name }: { name: string } = req.body;
    if (!name || name.length < 5) {
      return res
        .status(400)
        .json({ error: "Category name must be at least 5 characters long." });
    }
    const newCategory = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Failed to create category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.get("/api/templates", async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({
      error: "Internal Server Error",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/templates", async (req, res) => {
  try {
    const data: CreateTemplateRequest = req.body;

    // Basic server-side validation
    if (!data.title || !data.categoryName || !data.yaml) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTemplate = await prisma.template.create({
      data: {
        title: data.title,
        description: data.description,
        categoryName: data.categoryName,
        yaml: data.yaml,
      },
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Failed to create template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

app.delete("/api/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    await prisma.template.delete({
      where: { id: templateId },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

// GITHUB INTEGRATION ENDPOINTS //

app.get("/api/github/repos", async (req, res) => {
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

app.get("/api/github/repos/:owner/:repo/pulls", async (req, res) => {
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
