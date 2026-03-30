import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./api_types/index.js";

const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];

  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (
      err: jwt.VerifyErrors | null,
      decodedUser: string | jwt.JwtPayload | undefined,
    ) => {
      if (err || !decodedUser || typeof decodedUser === "string") {
        return res
          .status(403)
          .json({ error: "Invalid or expired session. Please log in again." });
      }
      req.user = decodedUser as AuthenticatedRequest["user"];
      next();
    },
  );
};

const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Access denied. Platform Administrator privileges required.",
    });
  }

  next();
};

export { authenticateToken, requireAdmin };
