import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    password: string;
    githubUsername?: string;
  };
}

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
export { type AuthenticatedRequest, authenticateToken };
