import express from "express";
import { PrismaClient } from "@devcentral/database";

const prisma = new PrismaClient();
const app = express();

app.get("/projects", async (req, res) => {
  const projects = await prisma.project.findMany();
  res.json(projects);
});
