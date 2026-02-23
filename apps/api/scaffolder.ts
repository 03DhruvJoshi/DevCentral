import path from "path";
import dotenv from "dotenv";
import express from "express";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import cors from "cors";
import { CreateTemplateRequest } from "./api_types/index";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "url";
import { IRouter } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;

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
    const data: CreateTemplateRequest = req.body;

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

router.delete("/api/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);

    if (isNaN(templateId)) {
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

export default router;
