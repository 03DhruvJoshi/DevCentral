import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    name: string;
    password: string;
    githubUsername: string;
  };
}

const isAuthenticatedUserPayload = (
  decodedUser: string | jwt.JwtPayload | undefined,
): decodedUser is AuthenticatedRequest["user"] => {
  if (!decodedUser || typeof decodedUser === "string") {
    return false;
  }

  return (
    typeof decodedUser.email === "string" &&
    typeof decodedUser.name === "string" &&
    typeof decodedUser.password === "string" &&
    typeof decodedUser.githubUsername === "string"
  );
};

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
      if (err || !isAuthenticatedUserPayload(decodedUser)) {
        return res
          .status(403)
          .json({ error: "Invalid or expired session. Please log in again." });
      }

      req.user = decodedUser;
      next();
    },
  );
};

export { type AuthenticatedRequest, authenticateToken };
