// The fixed categories defined in requirements
export const CATEGORIES = [
  "Application/Project Root",
  "Component/Feature Structure",
  "Configuration & Build Tools",
  "Testing Frameworks",
  "Documentation & Metadata",
  "Identity & Access Control",
] as const;

export interface Template {
  id: string;
  title: string;
  description: string;
  category: (typeof CATEGORIES)[number];
  yaml: string;
}

// Mock Boilerplates (1 per category for MVP)

export const MOCK_TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "Node.js Express Microservice Root",
    description:
      "Scaffolds a full TypeScript Node.js service with Dockerfile and package.json structures.",
    category: "Application/Project Root",
    yaml: `apiVersion: scaffolder.devcentral.io/v1alpha1
kind: Template
metadata:
  name: node-express-root
spec:
  owner: backend-team
  type: service
  parameters:
    - title: Service Name
      required: true
      type: string
  steps:
    - id: fetch-base
      action: fetch:template
      input:
        url: ./skeleton`,
  },
  {
    id: "t2",
    title: "React Functional Component (Tsx)",
    description:
      "Standardized React component structure with associated test file and CSS module.",
    category: "Component/Feature Structure",
    yaml: `apiVersion: scaffolder.devcentral.io/v1alpha1
kind: Template
metadata:
  name: react-component
spec:
  type: component
  parameters:
    - title: Component Name
      type: string
  steps:
    - action: fetch:template
      input:
        targetPath: ./src/components/{{ componentName }}`,
  },
  {
    id: "t3",
    title: "GitHub Actions CI Pipeline",
    description:
      "Standard CI workflow for build, lint, and test stages on pull requests.",
    category: "Configuration & Build Tools",
    yaml: `name: Node CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test`,
  },
  {
    id: "t4",
    title: "Vitest Unit Testing Setup",
    description:
      "Base configuration for Vitest with coverage reporting enabled.",
    category: "Testing Frameworks",
    yaml: `// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})`,
  },
  {
    id: "t5",
    title: "OpenAPI (Swagger) Spec Skeleton",
    description:
      "Basic structure for defining RESTful APIs using OpenAPI 3.0 standard.",
    category: "Documentation & Metadata",
    yaml: `openapi: 3.0.0
info:
  title: Sample API
  description: Optional multiline or single-line description in CommonMark or HTML.
  version: 0.1.9
servers:
  - url: http://api.example.com/v1
paths:
  /users:
    get:
      summary: Returns a list of users.
      responses:
        '200':    # status code
          description: A JSON array of user names`,
  },
  {
    id: "t6",
    title: "Auth0 Integration Boilerplate",
    description:
      "Pre-configured setup for securing an Express API with Auth0 JWTs.",
    category: "Identity & Access Control",
    yaml: `// Middleware setup needed for Auth0
import { auth } from 'express-oauth2-jwt-bearer';

const jwtCheck = auth({
  audience: 'https://my-api-identifier',
  issuerBaseURL: 'https://dev-central-tenant.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

// app.use(jwtCheck); // Apply to protected routes`,
  },
];
