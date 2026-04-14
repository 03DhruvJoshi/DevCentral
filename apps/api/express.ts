import express from "express";

import cors from "cors";

import gitops from "./components/gitops/gitops.js";
import scaffolder from "./components/scaffolder/scaffolder.js";
import devanalytics from "./components/devanalytics/devanalytics.js";
import auth from "./components/auth/auth.js";
import dashboard from "./components/dashboard/dashboard.js";
import admin from "./components/admin/admin.js";
import { auditMiddleware } from "./components/auth/auditMiddleware.js";
import deployment from "./components/deployment/deployment.js";

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
app.use(deployment);

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
