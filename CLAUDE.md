# Excalisave - Claude Code Instructions

Read `AGENTS.md` for full project context, architecture, and conventions.

## Quick Reference

- **Prisma 7**: Import from `@/generated/prisma/client`. URL in `prisma.config.ts` only, NOT in schema.
- **Zod v4**: `error.issues`, not `error.errors`.
- **Next.js 16**: `proxy.ts` for route protection, not `middleware.ts`. Params are `Promise<{ id: string }>`.
- **Excalidraw**: Dynamic import with `ssr: false` only.
- **Crypto**: `src/lib/crypto.ts` is client-only. Never import on server.
- After schema changes: `npx prisma generate` before building.
- Build check: `npm run build` to verify TypeScript + compilation.
- **Commits**: Use Conventional Commits (`feat(scope): description`). See `AGENTS.md` for details.
