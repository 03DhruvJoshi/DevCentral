import express, { IRouter, Response } from "express";
import { authenticateToken, requireAdmin } from "./authenticatetoken";
import {
  Prisma,
  PrismaClient,
} from "../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { AuthenticatedRequest } from "./api_types/index.js";

import cors from "cors";
import { JsonValue } from "../../packages/database/prisma/generated/runtime/client";

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

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  githubUsername: string | null;
  role: string;
  status: string;
  createdAt: Date;
};

type AuditLogRecord = {
  id: number;
  createdAt: Date;
  actorEmail: string;
  action: string;
  targetId: string | null;
  role: string | null;
details: JsonValue | null;
};

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

// BULK USER OPERATIONS — must be before /:id to avoid route collision
router.patch(
  "/api/admin/users/bulk",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userIds, action } = req.body as {
        userIds: string[];
        action: "SUSPEND" | "ACTIVATE" | "PROMOTE" | "DEMOTE";
      };

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json({ error: "userIds must be a non-empty array." });
      }

      const validActions = ["SUSPEND", "ACTIVATE", "PROMOTE", "DEMOTE"];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid action." });
      }

      const selfId = req.user!.id;
      const filteredIds = userIds.filter((id) => id !== selfId);
      const selfWasFiltered = filteredIds.length < userIds.length;

      const actionMap: Record<string, { status?: string; role?: string }> = {
        SUSPEND: { status: "SUSPENDED" },
        ACTIVATE: { status: "ACTIVE" },
        PROMOTE: { role: "ADMIN" },
        DEMOTE: { role: "DEV" },
      };

      const updateData = actionMap[action];

      if (!updateData) {
        return res.status(400).json({ error: "Invalid action." });
      }

      const result = await prisma.user.updateMany({
        data: updateData,
        where: { id: { in: filteredIds } },
         
      });

      await prisma.auditLog.create({
        data: {
          action: "BULK_USER_UPDATE",
          actorEmail: req.user!.email,
          targetId: "multiple",
          details: JSON.stringify({ action, count: result.count }),
        },
      });

      res.json({
        message: `Bulk ${action} applied to ${result.count} user(s).${selfWasFiltered ? " Your own account was excluded from the operation." : ""}`,
        count: result.count,
        selfExcluded: selfWasFiltered,
      });
    } catch (error) {
      console.error("Bulk user operation failed", error);
      res.status(500).json({ error: "Bulk user operation failed." });
    }
  },
);

// CSV EXPORT - USERS — must be before /:id to avoid route collision
router.get(
  "/api/admin/users/export",
  authenticateToken,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          githubUsername: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const header = "id,name,email,githubUsername,role,status,createdAt\n";
      const rows = users
        .map(
          (u: UserRecord) =>
            `"${u.id}","${u.name ?? ""}","${u.email}","${u.githubUsername ?? ""}","${u.role}","${u.status}","${u.createdAt.toISOString()}"`,
        )
        .join("\n");

      const csv = header + rows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="users-export.csv"',
      );
      res.send(csv);
    } catch (error) {
      console.error("Failed to export users CSV", error);
      res.status(500).json({ error: "Failed to export users." });
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

router.get(
  "/api/platform/features",
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const configs = await prisma.platformConfig.findMany();
      // Convert array of {key, value} into a simple object: { SCAFFOLDER_ENABLED: "true", ... }
      const featureMap = configs.reduce<Record<string, string>>(
        (acc: Record<string, string>, curr: { key: string; value: string }) => {
          acc[curr.key] = curr.value;
          return acc;
        },
        {},
      );
      res.json(featureMap);
    } catch (error) {
      console.error("Failed to load platform features", error);
      res.status(500).json({ error: "Failed to load features" });
    }
  },
);

// 2. UPDATED: PAGINATED & FILTERED AUDIT LOGS
router.get(
  "/api/admin/audit-logs",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const KNOWN_ACTION_FILTERS = [
        "CONFIG_UPDATED",
        "USER_UPDATED",
        "TEMPLATE_DEPLOYED",
        "GITOPS_ACTION",
        "DASHBOARD_UPDATED",
        "BULK_USER_UPDATE",
      ];

      // Read query parameters with defaults
      const pageQuery = Array.isArray(req.query.page)
        ? req.query.page[0]
        : req.query.page;
      const limitQuery = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
      const userQuery = Array.isArray(req.query.user)
        ? req.query.user[0]
        : req.query.user;
      const actionQuery = Array.isArray(req.query.action)
        ? req.query.action[0]
        : req.query.action;

      const page = Number.parseInt(String(pageQuery ?? "1"), 10) || 1;
      const limit = Number.parseInt(String(limitQuery ?? "20"), 10) || 20;
      const userFilter = typeof userQuery === "string" ? userQuery : "";
      const actionFilter = typeof actionQuery === "string" ? actionQuery : "";
      const skip = (page - 1) * limit;

      const actionWhereClause: Prisma.AuditLogWhereInput = {};
      if (actionFilter) {
        if (actionFilter === "OTHER") {
          actionWhereClause.action = {
            notIn: KNOWN_ACTION_FILTERS,
          };
        } else {
          actionWhereClause.action = actionFilter;
        }
      }

      // Build the search query
      const whereClause: Prisma.AuditLogWhereInput = {
        ...(userFilter
          ? {
              actorEmail: {
                contains: userFilter,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
        ...actionWhereClause,
      };

      // Run both the fetch and the count in parallel for speed
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip: skip,
          take: limit,
        }),
        prisma.auditLog.count({ where: whereClause }),
      ]);

      res.json({
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  },
);
//  FETCH PLATFORM CONFIG & FEATURE FLAGS
router.get(
  "/api/admin/config",
  authenticateToken,

  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      // We only seed the DB if it is literally empty (first boot)

      const configs = await prisma.platformConfig.findMany({
        orderBy: { key: "asc" },
      });

      res.json(configs);
    } catch (error) {
      console.error("Failed to load configuration from database", error);
      res
        .status(500)
        .json({ "Failed to load configuration from database.": error });
    }
  },
);

// ENHANCED ANALYTICS - DETAILED
router.get(
  "/api/admin/analytics/detailed",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = Date.now();
      const last24h = new Date(now - 86400000);
      const last7days = new Date(now - 7 * 86400000);

      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminUsers,
        devUsers,
        templates,
        categories,
        platformConfigs,
        auditTotal,
        audit24h,
        audit7days,
        recentActivity,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "SUSPENDED" } }),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "DEV" } }),
        prisma.template.count(),
        prisma.category.count(),
        prisma.platformConfig.count(),
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: last7days } } }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

      res.json({
        userStats: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          admins: adminUsers,
          devs: devUsers,
        },
        contentStats: {
          templates,
          categories,
          platformConfigs,
        },
        auditStats: {
          total: auditTotal,
          last24h: audit24h,
          last7days: audit7days,
        },
        recentActivity,
      });
    } catch (error) {
      console.error("Failed to fetch detailed analytics", error);
      res.status(500).json({ error: "Failed to fetch detailed analytics" });
    }
  },
);

// CSV EXPORT - AUDIT LOGS
router.get(
  "/api/admin/audit-logs/export",
  authenticateToken,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      const header = "id,createdAt,actorEmail,action,targetId,role,details\n";
      const rows = logs
        .map(
          (l: AuditLogRecord) =>
            `"${l.id}","${l.createdAt.toISOString()}","${l.actorEmail}","${l.action}","${l.targetId ?? ""}","${l.role ?? ""}","${(typeof l.details === "string" ? l.details : JSON.stringify(l.details ?? "")).replaceAll('"', '""')}"`,
        )
        .join("\n");

      const csv = header + rows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="audit-logs-export.csv"',
      );
      res.send(csv);
    } catch (error) {
      console.error("Failed to export audit logs CSV", error);
      res.status(500).json({ error: "Failed to export audit logs." });
    }
  },
);

// 2. UPSERT A CONFIG (Works for both Feature Flags and Broadcasts)
router.put(
  "/api/admin/config/:key",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keyParam = req.params.key;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
      const { value } = req.body;

      if (!key) {
        return res
          .status(400)
          .json({ error: "Configuration key is required." });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Upsert ensures that even if BROADCAST_MESSAGE was deleted, it will recreate it safely
      const updatedConfig = await prisma.platformConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          description:
            key === "BROADCAST_MESSAGE"
              ? "Global alert banner"
              : "Platform Feature Flag",
        },
      });

      // Log the action for compliance
      await prisma.auditLog.create({
        data: {
          action: "CONFIG_UPDATED",
          actorEmail: req.user.email,
          targetId: key,
          role: req.user.role,
          details: `Value changed to: ${value}`,
        },
      });

      res.json({
        message: "Configuration saved successfully",
        config: updatedConfig,
      });
    } catch (error) {
      console.error("Config Update Error:", error);
      res
        .status(500)
        .json({ error: "Failed to update platform configuration." });
    }
  },
);

router.delete(
  "/api/admin/config/:key",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const keyParam = req.params.key;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;

      if (!key) {
        return res
          .status(400)
          .json({ error: "Configuration key is required." });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await prisma.platformConfig.delete({
        where: { key },
      });

      // Log the deletion for compliance
      await prisma.auditLog.create({
        data: {
          action: "CONFIG_DELETED",
          actorEmail: req.user.email,
          targetId: key,
          role: req.user.role,
          details: `Configuration key deleted.`,
        },
      });

      res.json({
        message: "Configuration deleted successfully",
      });
    } catch (error) {
      console.error("Config Deletion Error:", error);
      res
        .status(500)
        .json({ error: "Failed to delete platform configuration." });
    }
  },
);

export default router;
