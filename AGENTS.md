# Excalisave

Self-hosted Excalidraw with end-to-end encryption.

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- PostgreSQL + Prisma ORM
- NextAuth.js v5 (credentials provider, JWT sessions)
- Web Crypto API (AES-GCM + PBKDF2) for client-side E2EE

## Key Architecture Decisions
- All crypto happens client-side only. The server never sees plaintext drawing data.
- Master key is held in React context (memory only). Lost on page refresh, requiring unlock modal.
- Standalone Next.js output for Docker deployment.

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npx prisma migrate dev` - Run database migrations
- `npx prisma generate` - Generate Prisma client
