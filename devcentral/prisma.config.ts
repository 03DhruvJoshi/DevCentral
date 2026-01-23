import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: path.resolve(process.cwd(), "packages/database/prisma/schema.prisma"),
  migrations: {
    path: path.resolve(
      process.cwd(),
      "packages/database/prisma/prisma/migrations",
    ),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
