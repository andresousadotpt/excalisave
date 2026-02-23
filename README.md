# Excalisave

A self-hosted [Excalidraw](https://excalidraw.com) drawing manager with end-to-end encryption. Save, organize, and access your drawings from anywhere — your data stays on your server.

## Features

- End-to-end encrypted drawings (client-side encryption with a master key)
- User authentication with email verification
- Admin user with configurable credentials
- Self-hostable with Docker

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Database:** PostgreSQL 17
- **ORM:** Prisma 7
- **Auth:** NextAuth.js v5
- **Drawing:** Excalidraw
- **Styling:** Tailwind CSS v4
- **Email:** Resend

## Quick Start (Docker)

```bash
git clone https://github.com/your-user/excalisave.git
cd excalisave
```

Create a `.env` file or pass environment variables directly:

```env
AUTH_SECRET=your-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-on-first-login
```

Start the application:

```bash
docker compose up -d
```

The app will be available at [http://localhost:3000](http://localhost:3000).

On startup, the container automatically:
1. Runs Prisma migrations (`prisma migrate deploy`)
2. Seeds the admin user
3. Starts the Next.js server

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (set by compose) | PostgreSQL connection string |
| `AUTH_SECRET` | `change-me-in-production` | Secret for signing auth tokens |
| `AUTH_URL` | `http://localhost:3000` | Public URL of the app |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL exposed to the client |
| `REGISTRATION_ENABLED` | `true` | Allow new user registration |
| `RESEND_API_KEY` | — | API key for sending emails via Resend |
| `EMAIL_FROM` | `Excalisave <noreply@example.com>` | Sender address for emails |
| `ADMIN_EMAIL` | `admin@example.com` | Default admin account email |
| `ADMIN_PASSWORD` | `change-me-on-first-login` | Default admin account password |

## Local Development

```bash
npm install
```

Start a local PostgreSQL database, then:

```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed the database
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
