import express from "express";

import cors from "cors";

import gitops from "./gitops.js";
import scaffolder from "./scaffolder.js";
import devanalytics from "./devanalytics.js";
import auth from "./auth.js";
import dashboard from "./dashboard.js";
import admin from "./admin.js";
import { auditMiddleware } from "./auditMiddleware.js";

const app = express();

const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(auth);
app.use(auditMiddleware);

app.use(gitops);
app.use(scaffolder);
app.use(devanalytics);
app.use(dashboard);
app.use(admin);

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

app.get("/api/health", (req, res) => {
  try {
    res.json({ status: "OK" });
  } catch (error) {
    console.error("Health Check Error:", error);
    res.status(500).json({ error: "Failed to perform health check" });
  }
});
