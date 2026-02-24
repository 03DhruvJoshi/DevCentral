import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express, { IRouter } from "express";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../packages/database/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import cors from "cors";

const router: IRouter = express.Router();

router.use(cors());
router.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = `${process.env.DIRECT_DATABASE_URL}`;
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
if (!connectionString) {
  throw new Error(
    "DIRECT_DATABASE_URL is not defined in environment variables",
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

router.post("/api/auth/register", async (req, res) => {
  try {
    const { email, name, password, githubUsername } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: { email, name, passwordHash, githubUsername },
    });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .json({
        error:
          "Prisma/client error, missing or invalid fields for email, name, password, or githubUsername",
      });
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword)
      return res.status(400).json({ error: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, githubUsername: user.githubUsername },
      jwtSecret,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
