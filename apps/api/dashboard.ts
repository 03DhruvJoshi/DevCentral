import express, { IRouter, Response } from "express";

import { authenticateToken } from "./authenticatetoken.js";
import { AuthenticatedRequest } from "./api_types/index.js";

import cors from "cors";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

router.get(
  "/api/dashboard/preferences",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Invalid session user." });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dashboardPreferences: true },
      });

      return res.json(user?.dashboardPreferences || { widgets: [] });
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
      res.status(500).json({ error: "Failed to load dashboard preferences" });
    }
  },
);

// 2. PUT (Save) User's Widget Layout
router.put(
  "/api/dashboard/preferences",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Invalid session user." });
      }

      const dashboardPreferences = req.body;

      if (!dashboardPreferences || typeof dashboardPreferences !== "object") {
        return res.status(400).json({ error: "Invalid preferences payload" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { dashboardPreferences },
      });

      res.json({ message: "Layout saved successfully!", dashboardPreferences });
    } catch (error) {
      console.error("Failed to save preferences:", error);
      res.status(500).json({ error: "Failed to save layout" });
    }
  },
);

export default router;
