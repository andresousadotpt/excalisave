# Contributing to Excalisave

Thanks for your interest in contributing! This guide will help you get set up and familiar with the project.

## Prerequisites

- Node.js 22+
- PostgreSQL 17+ (or Docker)
- A [Resend](https://resend.com) API key (for email verification)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/excalisave.git
cd excalisave
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum you need:

- `DATABASE_URL` — a running PostgreSQL instance
- `AUTH_SECRET` — generate one with `openssl rand -base64 32`
- `ENCRYPTION_KEY` — generate with `openssl rand -hex 32`
- `RESEND_API_KEY` — from [resend.com/api-keys](https://resend.com/api-keys)

### 3. Set up the database

```bash
npx prisma migrate dev --name init   # Create tables
npm run db:seed                       # Create super admin user (optional)
```

### 4. Start developing

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Using Docker

If you prefer not to install PostgreSQL locally:

```bash
docker compose up --build
```

This starts both the app and a PostgreSQL instance. The super admin user is seeded automatically from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars.

## Project Overview

Excalisave is a self-hosted Excalidraw app with end-to-end encryption. Read [`AGENTS.md`](./AGENTS.md) for the full architecture reference, including project structure, E2EE model, auth flow, role hierarchy, and API patterns.

Key things to know:

- **E2EE is client-side only** — the server never sees plaintext drawing data. All crypto lives in `src/lib/crypto.ts`.
- **Prisma 7** — import from `@/generated/prisma/client`. Database URL is in `prisma.config.ts`, not in the schema.
- **Next.js 16** — route protection uses `proxy.ts` (not `middleware.ts`). Route params are async (`Promise<{ id: string }>`).
- **Zod v4** — use `error.issues`, not `error.errors`.
- **Roles** — use `isAdminRole()` / `isSuperAdmin()` from `src/lib/roles.ts` for admin checks. Never hardcode `=== "admin"`.
- **Organization** — drawings can be grouped into Projects (one-to-many) and tagged with Tags (many-to-many). Names are server-encrypted.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed super admin user (idempotent) |

## Making Changes

### Branching

Create a feature branch from `main`:

```bash
git checkout -b feat/my-feature
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`

**Examples**:

```
feat(auth): add email verification via Resend
fix(crypto): lazy-init Resend to avoid build crash
refactor(dashboard): extract drawing grid into component
chore(docker): add tsx to production image for seed script
docs(readme): add deployment instructions
```

### Before Submitting

1. **Build passes** — run `npm run build` and fix any TypeScript or compilation errors.
2. **Lint passes** — run `npm run lint`.
3. **Schema changes** — if you modified `prisma/schema.prisma`, run `npx prisma generate` and create a migration with `npx prisma migrate dev --name describe-change`.
4. **Env vars** — if you added new environment variables, update `.env.example` and the table in `AGENTS.md`.

## Security

This project handles encrypted user data. Please keep these rules in mind:

- Never decrypt drawing data server-side
- Never log or expose master key material
- Always validate ownership (`drawing.userId === session.user.id`, same for projects and tags)
- Admin routes must check role via `isAdminRole(session.user.role)`, not `=== "admin"`
- Super admin operations must use `isSuperAdmin(session.user.role)`
- PII (emails, drawing/project/tag names) must be encrypted at rest with `ENCRYPTION_KEY`
- Use bcrypt for password hashing, PBKDF2 (600k iterations) for key derivation
- Generate fresh random IVs for every encryption operation

If you discover a security vulnerability, please report it privately rather than opening a public issue.
