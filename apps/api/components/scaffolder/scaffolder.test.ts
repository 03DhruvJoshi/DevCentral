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

  it("returns 201 when a valid template is created", async () => {
    (db.template.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: "New Template",
      description: "A test template",
      categoryName: "Web",
      yaml: "files:\n  - path: README.md\n    content: |\n      # test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/templates").send({
      title: "New Template",
      categoryName: "Web",
      yaml: "files:\n  - path: README.md\n    content: |\n      # test",
      description: "A test template",
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Template");
  });

  it("returns 500 when database fails during template creation", async () => {
    (db.template.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).post("/api/templates").send({
      title: "New Template",
      categoryName: "Web",
      yaml: "files: []",
    });

    expect(res.status).toBe(500);
  });
});

// ── GET /api/categories ───────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  it("returns 200 with a list of categories", async () => {
    (db.category.findMany as jest.Mock).mockResolvedValue([
      { id: "cat1", name: "Web" },
      { id: "cat2", name: "Backend" },
    ]);

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Web");
  });

  it("returns 500 when database fails for categories", async () => {
    (db.category.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(500);
  });
});

// ── POST /api/categories ──────────────────────────────────────────────────────

describe("POST /api/categories", () => {
  it("returns 201 when category is created successfully", async () => {
    (db.category.create as jest.Mock).mockResolvedValue({
      id: "cat1",
      name: "Mobile Apps",
    });

    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Mobile Apps" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Mobile Apps");
  });

  it("returns 400 when category name is too short (< 5 chars)", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Web" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/5 characters/i);
  });

  it("returns 500 when database fails during category creation", async () => {
    (db.category.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Valid Category Name" });

    expect(res.status).toBe(500);
  });
});

// ── POST /api/wizard/generate ─────────────────────────────────────────────────

describe("POST /api/wizard/generate", () => {
  it("returns 200 with generated YAML for a valid frameworkId", async () => {
    const res = await request(app).post("/api/wizard/generate").send({
      frameworkId: "nextjs",
      optionIds: ["typescript"],
    });

    expect(res.status).toBe(200);
    expect(res.body.yaml).toContain("files:");
  });

  it("returns 400 when frameworkId is missing", async () => {
    const res = await request(app)
      .post("/api/wizard/generate")
      .send({ optionIds: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/frameworkId is required/i);
  });
});

// ── PUT /api/templates/:id ────────────────────────────────────────────────────

describe("PUT /api/templates/:id", () => {
  it("returns 404 when the template does not exist", async () => {
    (db.template.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).put("/api/templates/9999").send({
      title: "Updated Template",
      categoryName: "Web",
      yaml: "files: []",
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/template not found/i);
  });

  it("returns 400 when the category does not exist", async () => {
    (db.template.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (db.category.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).put("/api/templates/1").send({
      title: "Updated Template",
      categoryName: "Nonexistent",
      yaml: "files: []",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category does not exist/i);
  });

  it("returns 200 when the template is updated successfully", async () => {
    (db.template.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (db.category.findUnique as jest.Mock).mockResolvedValue({ id: "cat1" });
    (db.template.update as jest.Mock).mockResolvedValue({
      id: 1,
      title: "Updated Template",
      description: "Updated",
      categoryName: "Web",
      yaml: "files: []",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).put("/api/templates/1").send({
      title: "Updated Template",
      categoryName: "Web",
      yaml: "files: []",
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Template");
  });
});

// ── DELETE /api/templates/:id ─────────────────────────────────────────────────

describe("DELETE /api/templates/:id", () => {
  it("returns 204 when the template is deleted", async () => {
    (db.template.delete as jest.Mock).mockResolvedValue({ id: 1 });

    const res = await request(app).delete("/api/templates/1");

    expect(res.status).toBe(204);
  });

  it("returns 400 when the template ID is not a valid number", async () => {
    const res = await request(app).delete("/api/templates/not-a-number");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid template id/i);
  });

  it("returns 500 when the database throws during deletion", async () => {
    (db.template.delete as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app).delete("/api/templates/1");

    expect(res.status).toBe(500);
  });
});

// ── POST /api/scaffolder/execute — additional coverage ───────────────────────

describe("POST /api/scaffolder/execute — new repo creation", () => {
  it("returns 200 after creating a new repository and pushing files", async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue({
      githubAccessToken: "gho_valid",
      githubUsername: "testuser",
    });
    (db.template.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      yaml: "files:\n  - path: README.md\n    content: |\n      # test",
    });
    // Repo does NOT exist yet (get throws 404)
    (mockReposRest.get as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );
    (mockReposRest.createForAuthenticatedUser as jest.Mock).mockResolvedValue({
      data: { html_url: "https://github.com/testuser/new-repo" },
    });
    (mockReposRest.getContent as jest.Mock).mockRejectedValue(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );
    (mockReposRest.createOrUpdateFileContents as jest.Mock).mockResolvedValue({});

    const res = await request(app).post("/api/scaffolder/execute").send({
      templateId: 1,
      targetRepoName: "new-repo",
      isNewRepo: true,
      description: "My new project",
    });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("testuser/new-repo");
  });
});

// ── GET /api/_dbinfo ─────────────────────────────────────────────────────────

describe("GET /api/_dbinfo", () => {
  it("returns 200 with database connection info", async () => {
    (db.$queryRaw as jest.Mock).mockResolvedValue([
      { db: "mydb", schema: "public", user: "postgres", host: "localhost", port: 5432 },
    ]);

    const res = await request(app).get("/api/_dbinfo");

    expect(res.status).toBe(200);
    expect(res.body.db).toBe("mydb");
  });

  it("returns 500 when database query fails", async () => {
    (db.$queryRaw as jest.Mock).mockRejectedValue(new Error("Connection refused"));

    const res = await request(app).get("/api/_dbinfo");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/DBINFO failed/i);
  });
});

// ── GET /api/wizard/categories ────────────────────────────────────────────────

describe("GET /api/wizard/categories", () => {
  it("returns 200 with a list of active wizard categories", async () => {
    (db as any).wizardCatalogCategory = {
      findMany: jest.fn().mockResolvedValue([
        { id: "cat1", label: "Web", isActive: true, displayOrder: 1 },
      ]),
    };

    const res = await request(app).get("/api/wizard/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].label).toBe("Web");
  });

  it("returns 500 when database fails for wizard categories", async () => {
    (db as any).wizardCatalogCategory = {
      findMany: jest.fn().mockRejectedValue(new Error("DB error")),
    };

    const res = await request(app).get("/api/wizard/categories");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/wizard/frameworks ────────────────────────────────────────────────

describe("GET /api/wizard/frameworks", () => {
  it("returns 200 with a list of active frameworks", async () => {
    (db as any).wizardFramework = {
      findMany: jest.fn().mockResolvedValue([
        { id: "nextjs", label: "Next.js", isActive: true, displayOrder: 1, categoryId: "cat1" },
      ]),
    };

    const res = await request(app).get("/api/wizard/frameworks");

    expect(res.status).toBe(200);
    expect(res.body[0].label).toBe("Next.js");
  });

  it("returns 200 filtered by categoryId query param", async () => {
    (db as any).wizardFramework = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    const res = await request(app).get("/api/wizard/frameworks?categoryId=cat1");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 500 when database fails for wizard frameworks", async () => {
    (db as any).wizardFramework = {
      findMany: jest.fn().mockRejectedValue(new Error("DB error")),
    };

    const res = await request(app).get("/api/wizard/frameworks");

    expect(res.status).toBe(500);
  });
});

// ── GET /api/wizard/options ───────────────────────────────────────────────────

describe("GET /api/wizard/options", () => {
  it("returns 200 with all active options when no frameworkId provided", async () => {
    (db as any).wizardOption = {
      findMany: jest.fn().mockResolvedValue([
        { id: "typescript", label: "TypeScript", isActive: true, displayOrder: 1 },
      ]),
    };

    const res = await request(app).get("/api/wizard/options");

    expect(res.status).toBe(200);
    expect(res.body[0].label).toBe("TypeScript");
  });

  it("returns 200 with framework-specific options when frameworkId is provided", async () => {
    (db as any).wizardFrameworkOption = {
      findMany: jest.fn().mockResolvedValue([
        {
          displayOrder: 1,
          defaultEnabled: false,
          option: {
            id: "typescript",
            label: "TypeScript",
            description: "Add TypeScript",
            tier: "free",
            icon: "ts",
            isActive: true,
          },
        },
      ]),
    };

    const res = await request(app).get("/api/wizard/options?frameworkId=nextjs");

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("typescript");
  });

  it("returns 500 when database fails for wizard options", async () => {
    (db as any).wizardOption = {
      findMany: jest.fn().mockRejectedValue(new Error("DB error")),
    };

    const res = await request(app).get("/api/wizard/options");

    expect(res.status).toBe(500);
  });
});
