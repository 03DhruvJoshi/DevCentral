import { Response, NextFunction } from "express";
import { PrismaClient } from "../../../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { AuthenticatedRequest } from "../../api_types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

function resolveAction(method: string, urlPath: string): string {
  const upperMethod = method.toUpperCase();

  if (upperMethod === "POST" && /\/api\/scaffold/i.test(urlPath)) {
    return "TEMPLATE_DEPLOYED";
  }

  if (upperMethod === "POST" && /\/scaffold/i.test(urlPath)) {
    return "TEMPLATE_CREATED";
  }

  if (upperMethod === "DELETE" && /\/scaffold/i.test(urlPath)) {
    return "TEMPLATE_DELETED";
  }

  if (upperMethod === "PUT" && urlPath === "/api/dashboard/preferences") {
    return "DASHBOARD_UPDATED";
  }

  if (upperMethod === "POST" && /\/api\/(github|gitops)/i.test(urlPath)) {
    return "GITOPS_ACTION";
  }

  if (upperMethod === "POST" && urlPath === "/api/auth/register") {
    return "USER_REGISTERED";
  }

  if (upperMethod === "PATCH" && /\/api\/admin\/users\/[^/]+$/.test(urlPath)) {
    return "USER_UPDATED";
  }

  return `${upperMethod}:${urlPath}`;
}

export const auditMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const method = req.method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!isMutation) {
    next();
    return;
  }

  const urlPath = req.path;

  // Skip admin config paths — those self-log
  if (/\/api\/admin\/config\//i.test(urlPath)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    const statusCode = res.statusCode;

    // Only log 2xx responses for authenticated users
    if (statusCode >= 200 && statusCode < 300 && req.user) {
      const action = resolveAction(method, urlPath);
      const actorEmail = req.user.email;
      const role = req.user.role;

      // Fire-and-forget audit log creation
      prisma.auditLog
        .create({
          data: {
            action,
            actorEmail,
            targetId: urlPath,
            role,
            details: JSON.stringify({ method, path: urlPath }),
          },
        })
        .catch((err: unknown) => {
          console.error("[AuditMiddleware] Failed to write audit log:", err);
        });
    }

    return originalJson(body);
  };

  next();
};

export default auditMiddleware;
