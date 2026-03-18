import path from "node:path";
import dotenv from "dotenv";
import express, { IRouter, Response } from "express";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import cors from "cors";
import { CreateTemplateRequest } from "./api_types/index";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { Octokit } from "octokit";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "./authenticatetoken.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const githubToken = `${process.env.GITHUB_TOKEN}`;

const octokit = new Octokit({
  auth: githubToken,
});

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

router.get("/api/_dbinfo", async (req, res) => {
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

router.get("/api/categories", async (req, res) => {
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

router.post("/api/categories", async (req, res) => {
  try {
    const { name }: { name: string } = req.body;
    const trimmedName = name?.trim() || "";

    if (!trimmedName || trimmedName.length < 5) {
      return res
        .status(400)
        .json({ error: "Category name must be at least 5 characters long." });
    }

    const newCategory = await prisma.category.create({
      data: { name: trimmedName },
    });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Failed to create category:", error);
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Category with this name already exists" });
    }

    res.status(500).json({ error: "Failed to create category" });
  }
});

router.get("/api/templates", async (_req, res) => {
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

router.post("/api/templates", async (req, res) => {
  try {
    const data = req.body as CreateTemplateRequest | undefined;

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        error: "Invalid request body. Expected JSON payload.",
      });
    }

    if (!data.title || !data.categoryName || !data.description || !data.yaml) {
      return res.status(400).json({
        error:
          "Missing required fields: title, categoryName, description, and yaml are all required",
      });
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

    // Handle foreign key constraint error (missing category)
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(400).json({ error: "Category does not exist" });
    }

    // Handle unique constraint error
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Template with this configuration already exists" });
    }

    res.status(500).json({ error: "Failed to create template" });
  }
});

router.put("/api/templates/:id", async (req, res) => {
  try {
    const data = req.body as CreateTemplateRequest | undefined;

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        error: "Invalid request body. Expected JSON payload.",
      });
    }

    const templateId = Number.parseInt(req.params.id, 10);

    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name: data.categoryName },
      select: { id: true },
    });

    if (!existingCategory) {
      return res.status(400).json({ error: "Category does not exist" });
    }

    // Prisma update query
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        title: data.title,
        description: data.description,
        categoryName: data.categoryName,
        yaml: data.yaml,
      },
    });

    res.status(200).json(updatedTemplate);
  } catch (error: unknown) {
    console.error("Update Template Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    res.status(500).json({
      error: "Failed to update template",
      detail: errorMessage,
    });
  }
});

router.delete("/api/templates/:id", async (req, res) => {
  try {
    const templateId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(templateId)) {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    await prisma.template.delete({
      where: { id: templateId },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete template:", error);
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Template not found" });
    }
    res.status(500).json({ error: "Failed to delete template" });
  }
});

/* 

SCAFFOLD FUNCTION 

*/

router.post(
  "/api/scaffolder/execute",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { templateId, targetRepoName, isNewRepo, description } = req.body;
      const githubUsername = req.user?.githubUsername;

      if (!githubUsername) {
        return res
          .status(400)
          .json({ error: "No GitHub username linked to your account." });
      }

      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template)
        return res.status(404).json({ error: "Template not found" });

      const parsedYaml = yaml.load(template.yaml) as Record<string, unknown>;
      const filesToCreate =
        (parsedYaml.files as Array<{ path: string; content: string }>) || [];

      let repoExists = false;
      try {
        await octokit.rest.repos.get({
          owner: githubUsername,
          repo: targetRepoName,
        });
        repoExists = true; // If this succeeds without throwing, the repo exists
      } catch (error: unknown) {
        // If the error is anything OTHER than 404 (Not Found), it's a real error (like 401 Unauthorized)
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status !== 404
        ) {
          throw error;
        }
      }

      if (isNewRepo && repoExists) {
        return res.status(400).json({
          error: `Repository '${targetRepoName}' already exists. Please select 'Use an Existing Repository' to deploy the boilerplate into it.`,
        });
      }

      if (!isNewRepo && !repoExists) {
        return res.status(400).json({
          error: `Repository '${targetRepoName}' does not exist. Please select 'Create a new Repository' to create it.`,
        });
      }

      if (isNewRepo) {
        console.log(`Creating new repository: ${targetRepoName}...`);
        await octokit.rest.repos.createForAuthenticatedUser({
          name: targetRepoName,
          description: description || `Generated by DevCentral Platform`,
          private: true,
          auto_init: true,
        });

        // Wait a moment for GitHub servers to initialize the repository
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      console.log(
        `Pushing template files to ${githubUsername}/${targetRepoName}...`,
      );

      for (const file of filesToCreate) {
        const customizedContent = file.content.replaceAll(
          "{{projectName}}",
          targetRepoName,
        );
        const base64Content = Buffer.from(customizedContent).toString("base64");

        let fileSha;
        try {
          const existingFile = await octokit.rest.repos.getContent({
            owner: githubUsername,
            repo: targetRepoName,
            path: file.path,
          });

          if (!Array.isArray(existingFile.data)) {
            fileSha = existingFile.data.sha;
          }
        } catch (error: unknown) {
          // A 404 here just means the file doesn't exist yet, which is perfect!
          if (
            error &&
            typeof error === "object" &&
            "status" in error &&
            error.status !== 404
          ) {
            throw error;
          }
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: githubUsername,
          repo: targetRepoName,
          path: file.path,
          message: `feat(scaffold): ${fileSha ? "update" : "add"} ${file.path} via DevCentral`,
          content: base64Content,
          sha: fileSha,
        });
      }

      res.status(200).json({
        message: "Scaffolding complete!",
        url: `https://github.com/${githubUsername}/${targetRepoName}`,
      });
    } catch (error: unknown) {
      console.error("Scaffolder Execution Error:", error);

      const errorMsg =
        error instanceof Error ? error.message : "Failed to execute scaffold";

      res.status(500).json({ error: errorMsg });
    }
  },
);

export default router;
