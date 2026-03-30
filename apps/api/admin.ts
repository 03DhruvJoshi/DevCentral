import express, { IRouter, Response } from "express";
import { authenticateToken, requireAdmin } from "./authenticatetoken";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { AuthenticatedRequest } from "./api_types/index.js";

import cors from "cors";
import { AuthenticatedRequest } from "./api_types";

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
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = (req.query.search as string) || "";

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { githubUsername: { contains: search, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          githubUsername: true,
          role: true,
          status: true, // Included new status field
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ users });
    } catch (error) {
      res.status(500).json({ "Failed to fetch users": error });
    }
  },
);

router.patch(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { role, status } = req.body;

      if (id === req.user!.id) {
        return res.status(400).json({
          error: "You cannot modify your own administrative account.",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(status && { status }),
        },
      });

      res.json({ message: "User successfully updated.", user: updatedUser });
    } catch (error) {
      res.status(500).json({ "Failed to update user.": error });
    }
  },
);
// GET ADVANCED SYSTEM ANALYTICS
router.get(
  "/api/admin/analytics",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [totalUsers, activeUsers, totalTemplates, recentUsers] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { status: "ACTIVE" } }),
          prisma.template.count(),
          prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { name: true, createdAt: true },
          }),
        ]);

      res.json({
        metrics: { totalUsers, activeUsers, totalTemplates },
        recentSignups: recentUsers,
      });
    } catch (error) {
      res.status(500).json({ "Failed to fetch analytics": error });
    }
  },
);

// PROMOTE / DEMOTE USER ROLE
router.put(
  "/api/admin/users/:id/role",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { newRole } = req.body; // Expects "DEV" or "ADMIN"

      // Security: Prevent the admin from demoting themselves!
      if (id === req.user!.id) {
        return res
          .status(400)
          .json({ error: "You cannot change your own role." });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role: newRole },
      });

      res.json({ message: `User updated to ${newRole}`, user: updatedUser });
    } catch (error) {
      res.status(500).json({ "Failed to update user role.": error });
    }
  },
);

// DELETE USER
router.delete(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;

      if (id === req.user!.id) {
        return res
          .status(400)
          .json({ error: "You cannot delete your own account." });
      }

      await prisma.user.delete({ where: { id } });
      res.json({ message: "User securely removed from platform." });
    } catch (error) {
      res.status(500).json({ "Failed to delete user.": error });
    }
  },
);

export default router;
