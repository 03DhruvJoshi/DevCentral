/**
 * Tests for scaffolder.ts — Template CRUD & GitHub scaffolding
 * Routes covered:
 *   POST /api/scaffolder/execute  — scaffold a repo from a template
 *   GET  /api/templates           — list all templates
 *   POST /api/templates           — create a new template
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// ── Shared mock instances ─────────────────────────────────────────────────────

const db = {
  user: { findUnique: jest.fn() },
  template: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockReposRest = {
  get: jest.fn(),
  createForAuthenticatedUser: jest.fn(),
  getContent: jest.fn(),
  createOrUpdateFileContents: jest.fn(),
};

// ── ESM module mocks ──────────────────────────────────────────────────────────

jest.unstable_mockModule("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(() => ({})),
}));

jest.unstable_mockModule(
  "../../../../packages/database/prisma/generated/client",
  () => ({
    PrismaClient: jest.fn(() => db),
  }),
);

jest.unstable_mockModule("../auth/authenticatetoken", () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: () => void) => {
    req.user = { id: "user-id", email: "user@test.com", role: "DEV" };
    next();
  }),
}));

jest.unstable_mockModule("octokit", () => ({
  Octokit: jest.fn(() => ({ rest: { repos: mockReposRest } })),
}));

jest.unstable_mockModule("../wizardgenerator/wizardgenerator", () => ({
  generateYaml: jest.fn(
    () => "files:\n  - path: README.md\n    content: |\n      # test",
  ),
}));

// js-yaml is a CJS module imported as `import yaml from "js-yaml"` — provide
// a `default` export so the ESM→CJS default-import interop resolves correctly.
const yamlLoadMock = jest.fn(() => ({
  files: [{ path: "README.md", content: "# {{projectName}}" }],
}));
jest.unstable_mockModule("js-yaml", () => ({
  default: { load: yamlLoadMock },
  load: yamlLoadMock,
}));

// ── Dynamic import ────────────────────────────────────────────────────────────

const { default: router } = await import("./scaffolder");

// ── Test app ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(router as any);

beforeEach(() => jest.clearAllMocks());

// ── Test suites ───────────────────────────────────────────────────────────────

describe("POST /api/scaffolder/execute", () => {
  it("returns 200 with the repo URL after successfully pushing files to an existing repo", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: "gho_valid",
      githubUsername: "testuser",
    });
    (db.template.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      yaml: "files:\n  - path: README.md\n    content: |\n      # test",
    });
    // Repo exists (get resolves without error)
    (mockReposRest.get as jest.Mock).mockResolvedValue({});
    // File not found yet (getContent throws 404)
    (mockReposRest.getContent as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );
    (mockReposRest.createOrUpdateFileContents as jest.Mock).mockResolvedValue({});

    const res = await request(app).post("/api/scaffolder/execute").send({
      templateId: 1,
      targetRepoName: "my-new-project",
      isNewRepo: false,
      description: "Test project",
    });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("testuser/my-new-project");
  });

  it("returns 403 when the user has not connected a GitHub account", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: null,
      githubUsername: null,
    });

    const res = await request(app).post("/api/scaffolder/execute").send({
      templateId: 1,
      targetRepoName: "any-repo",
      isNewRepo: false,
    });

    expect(res.status).toBe(403);
    expect(res.body.githubNotConnected).toBe(true);
  });

  it("returns 404 when the requested template does not exist in the database", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: "gho_valid",
      githubUsername: "testuser",
    });
    (db.template.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post("/api/scaffolder/execute").send({
      templateId: 9999,
      targetRepoName: "my-project",
      isNewRepo: false,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/template not found/i);
  });
});

describe("GET /api/templates", () => {
  it("returns 200 with an array of all templates", async () => {
    (db.template.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        title: "Next.js Starter",
        description: "A Next.js template",
        categoryName: "Web",
        yaml: "files: []",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res = await request(app).get("/api/templates");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe("Next.js Starter");
  });

  it("returns 500 when the database connection fails during the template fetch", async () => {
    (db.template.findMany as jest.Mock).mockRejectedValue(
      new Error("NeonDB: serverless function cold-start timeout"),
    );

    const res = await request(app).get("/api/templates");

    expect(res.status).toBe(500);
  });
});

describe("POST /api/templates", () => {
  it("returns 400 when required fields (title, categoryName, yaml) are missing", async () => {
    const res = await request(app)
      .post("/api/templates")
      .send({ title: "Incomplete Template" }); // missing categoryName and yaml

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});
