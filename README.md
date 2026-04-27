# DevCentral — Internal Developer Platform

A lightweight Internal Developer Platform for solo developers and small engineering teams. Centralises service scaffolding, GitOps infrastructure orchestration, and delivery analytics into a single interface.

---

## Accessing the Platform

### Option 1 — Live Deployment (Recommended)

The platform is fully deployed and requires no setup.

**URL:** [https://devcentral.online](https://devcentral.online)

All environment variables and integrations are pre-configured on the remote instance. This is the recommended route for assessors.

### Option 2 — Run Locally

> **Note:** The local instance requires a `.env` file containing API keys and database credentials. Because these values are sensitive, they are not included in the repository or the submitted ZIP. The live deployment at `https://devcentral.online` is the intended access method for assessment. If local access is required, please contact the author directly to arrange a secure transfer of the `.env` file.

An `.env.example` file is provided as a placeholder, in order to guide the user for the values to add the real environment values once provided by the author. 

**Prerequisites:** Node.js 18+, pnpm 8+, PostgreSQL instance (or use the Neon connection string provided separately).

```bash
# 1. Clone the repository
git clone https://github.com/03DhruvJoshi/DevCentral.git
cd DevCentral

# 2. Place the .env file in apps/api/ (provided separately)

# 3. Install dependencies
pnpm install

# 4. Run database migrations
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..

# 5. Start all services
pnpm dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:4000`.

---

## Getting Started on the Live Platform

### 1. Create an Account

1. Go to [https://devcentral.online](https://devcentral.online) and click **Register**.
2. Enter your name, email address, and a password.
3. A one-time verification code will be sent to your email — enter it to complete registration.
4. Log in with your credentials.

> If you do not receive the verification email, check your spam folder. The email is sent from Brevo.

### 2. Connect Your GitHub Account

After logging in you will be directed to the GitHub integration page. Click **Connect GitHub** and authorise the DevCentral GitHub App. This grants the platform permission to create repositories, read workflow runs, and trigger deployments on your behalf.

You can disconnect or reconnect GitHub at any time from **Settings > Integrations**.

---

## Feature Walkthrough

### Dashboard

The homepage is a widget-based dashboard. Click **Add Widget** to choose which widgets are displayed (recent activity, deployment health, DORA summary, etc.). Your layout is saved automatically and restored on every login.

### Scaffolder — Create a New Service

1. Navigate to **Scaffolder** in the sidebar.
2. Browse the template marketplace and select a template (e.g., Node.js REST API, React App).
3. Click **Use Template** and fill in the service name and parameters, either through the form or the guided wizard.
4. Click **Instantiate** — the platform will create a new GitHub repository and push the rendered template as an initial commit.

You can also create your own templates by clicking **New Template** and authoring a `template.yaml` manifest directly or through the wizard builder.

### GitOps — Monitor and Deploy Repositories

1. Navigate to **GitOps** in the sidebar.
2. Select a repository from your connected GitHub account.
3. The **Health** tab shows automated checks across security, code quality, deployment readiness, and team ownership, with categorised issues and remediation suggestions.
4. The **Activity** tab lists commits, pull requests, issues, releases, and CI/CD workflow runs.
5. The **Deploy** tab allows you to trigger deployments via GitHub Actions, Vercel, or Render.

#### Setting up Deployment Triggers

- **GitHub Actions:** Ensure your repository has a workflow file that accepts a `repository_dispatch` event. The platform will send a dispatch to trigger it.
- **Vercel / Render:** Navigate to the Deploy tab and enter your Vercel or Render deploy hook URL. The platform will call this URL when you trigger a deployment.

### Dev Analytics — DORA Metrics

1. Navigate to **Dev Analytics** in the sidebar.
2. Select a repository.
3. Three tabs are available:
   - **Security** — requires SonarQube integration (see below). Displays vulnerabilities, bugs, and code smells by severity.
   - **CI/CD** — shows build success rates, failure reasons, and average build times from GitHub Actions.
   - **Deployment** — displays DORA metrics (Deployment Frequency, Lead Time, MTTR, Change Failure Rate). Requires a Vercel or Render API key (see below).
4. Use the rolling window selector (7 / 14 / 30 days) to adjust the analysis period.

#### Setting up SonarQube Integration

1. Go to **Settings > Integrations**.
2. Enter your SonarQube host URL, project key, and API token.
3. Return to Dev Analytics — the Security tab will now populate with data.

#### Setting up Vercel or Render for Deployment Metrics

1. Go to **Settings > Integrations**.
2. Enter your Vercel API token and team/project ID, or your Render API key and service ID.
3. Return to Dev Analytics — the Deployment tab will display live DORA metrics.

### User Settings

Navigate to **Settings** to:
- Update your display name, email, or password.
- Manage connected integrations (GitHub, SonarQube, Vercel, Render).
- Delete your account.

---

## Admin Panel

Admin accounts have access to an additional **Admin** panel in the sidebar. It provides:

- **Security Summary** — active users, recent logins, failed authentication attempts.
- **User Directory** — modify user roles (dev/admin), suspend or reactivate accounts, export user data as CSV.
- **Audit Log** — filterable, exportable record of all platform actions.
- **Feature Flags** — enable or disable platform features (Scaffolder, GitOps, Analytics) in real time, and broadcast a maintenance message to all users.

> A test admin account is available on the live instance for assessment purposes. Credentials are provided in the project submission notes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, shadcn/ui, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM |
| Hosting | Vercel (frontend), Render (backend) |
| Auth | JWT, bcrypt, MFA via Brevo |
| Testing | Jest + Supertest (backend), Vitest (frontend), Grafana k6 (load) |

---

## Running Tests

```bash
# Backend tests with coverage
cd apps/api
pnpm test:coverage

# Frontend tests with coverage
cd apps/web
pnpm test:ui
```
