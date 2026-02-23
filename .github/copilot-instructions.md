# Excalisave - GitHub Copilot Instructions

Read `AGENTS.md` at the project root for full project context, architecture, and conventions.

## Key Rules

- **Prisma 7**: Import from `@/generated/prisma/client`, NOT `@prisma/client`. Datasource URL is in `prisma.config.ts`, NOT in `schema.prisma`.
- **Zod v4**: Use `error.issues[0].message`, NOT `error.errors[0].message`.
- **Next.js 16**: Route protection uses `proxy.ts`, NOT `middleware.ts`. Route params are `Promise<{ id: string }>` and must be awaited.
- **Excalidraw**: Must use `dynamic(() => import("@excalidraw/excalidraw"), { ssr: false })`.
- **Crypto**: All encryption/decryption is in `src/lib/crypto.ts` and runs client-side only. Never import crypto functions in server components or API routes.
- **Components**: All interactive components must be `"use client"`.
- **API routes**: Always call `auth()` from `@/auth`, check `session.user.id` for ownership, `session.user.role` for admin.
- **Security**: Never decrypt drawing data server-side. Never log master key material. Always validate `drawing.userId === session.user.id`.
- **After schema changes**: Run `npx prisma generate` before building.
- **Commits**: Use Conventional Commits (`<type>(<scope>): <description>`). Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`.
