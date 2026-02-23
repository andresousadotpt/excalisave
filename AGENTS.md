# Excalisave

Self-hosted Excalidraw with end-to-end encryption. The server never sees plaintext drawing data.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL + Prisma 7 ORM (`@prisma/adapter-pg`)
- **Auth**: NextAuth.js v5 (credentials provider, JWT sessions)
- **E2EE**: Web Crypto API (AES-GCM + PBKDF2), client-side only
- **Email**: Resend
- **Drawing**: @excalidraw/excalidraw
- **Validation**: Zod v4
- **Deployment**: Multi-stage Dockerfile + docker-compose

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Providers
│   ├── page.tsx                # Landing page
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          # Navbar + UnlockModal wrapper
│   │   └── page.tsx            # Drawing grid with project/tag filters
│   ├── draw/[id]/page.tsx      # Excalidraw editor
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Stats + user management + role dropdown
│   ├── account/
│   │   └── page.tsx            # Settings: password, PIN, export, delete
│   ├── change-password/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   ├── register/route.ts
│       │   ├── verify/route.ts
│       │   ├── pin/route.ts          # POST set/update, DELETE remove
│       │   ├── change-password/route.ts
│       │   ├── accept-invite/route.ts
│       │   └── account/route.ts      # GET export, DELETE account
│       ├── drawings/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts          # GET, PUT, DELETE
│       │       └── tags/route.ts     # PUT set tags for drawing
│       ├── projects/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [id]/route.ts         # PUT update, DELETE
│       ├── tags/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [id]/route.ts         # PUT update, DELETE
│       └── admin/
│           ├── stats/route.ts
│           ├── settings/route.ts
│           └── users/
│               ├── route.ts
│               └── [id]/route.ts
├── components/
│   ├── providers.tsx              # SessionProvider + MasterKeyProvider
│   ├── ExcalidrawEditor.tsx       # Dynamic import, ssr: false, floating bar
│   ├── DrawingFloatingBar.tsx     # Bottom-center collapsed pill / expanded panel
│   ├── DrawingCard.tsx            # Card with project badge + tag pills
│   ├── CreateDrawingDialog.tsx    # Name + optional project selector
│   ├── DeleteDrawingDialog.tsx
│   ├── ManageProjectsDialog.tsx   # CRUD for projects (name + color)
│   ├── ManageTagsDialog.tsx       # CRUD for tags (name + color)
│   ├── TagSelector.tsx            # Multi-select tag picker for drawings
│   ├── SetPinDialog.tsx           # Set/change PIN for quick unlock
│   ├── UnlockModal.tsx
│   ├── UnsavedChangesDialog.tsx
│   ├── AuthForm.tsx
│   ├── Navbar.tsx
│   └── ThemeToggle.tsx
├── hooks/
│   ├── useMasterKey.ts            # React context for CryptoKey
│   ├── useAutoSave.ts             # Debounced encrypt + save
│   ├── useDrawing.ts              # Load + decrypt / encrypt + save (includes project info)
│   └── useUnsavedChangesWarning.ts
├── lib/
│   ├── prisma.ts                  # PrismaClient singleton (PrismaPg adapter)
│   ├── crypto.ts                  # E2EE functions (client-side only)
│   ├── server-crypto.ts           # Server-side AES-256-GCM for PII (email, drawing/project/tag names)
│   ├── roles.ts                   # isAdminRole(), isSuperAdmin() helpers
│   ├── rate-limit.ts              # In-memory rate limiter
│   ├── email.ts                   # Resend email service
│   ├── settings.ts                # DB-backed settings helpers
│   └── constants.ts
├── auth.ts                        # NextAuth config (JWT with session update support)
├── proxy.ts                       # Route protection (replaces middleware in Next.js 16)
└── types/
    └── next-auth.d.ts             # Session/JWT type augmentations
prisma/
├── schema.prisma
├── prisma.config.ts
└── seed.ts                        # Idempotent admin user seed (super_admin)
```

## Architecture

### E2EE Model

All crypto runs in the browser via Web Crypto API. The server stores only ciphertext.

- **Registration**: Generate 256-bit AES-GCM master key → derive wrapping key from password (PBKDF2, SHA-256, 600k iterations) → encrypt master key → store encrypted key + salt + IV on server
- **Login**: JWT session embeds encrypted key material → client derives wrapping key from password → decrypts master key → held in React context (memory only)
- **PIN unlock**: Optional 8-char alphanumeric PIN wraps the master key as an alternative to the full password for faster unlocking. PIN-wrapped key stored alongside password-wrapped key.
- **Save drawing**: Serialize scene → random 12-byte IV → AES-GCM encrypt → PUT to API
- **Load drawing**: GET encrypted blob → AES-GCM decrypt → render in Excalidraw
- **Page refresh**: Master key lost. UnlockModal prompts password or PIN to re-derive

### Auth Flow

- NextAuth v5 Credentials provider with bcrypt password hashing
- JWT sessions carry encrypted master key material + user role + PIN key material
- JWT supports `trigger === "update"` for refreshing PIN fields without re-login
- Email verification required before login (via Resend)
- `proxy.ts` protects routes (Next.js 16 proxy convention, replaces middleware)
- Admin users (admin/super_admin) redirect to `/admin`, regular users to `/dashboard`
- `mustChangePassword` flag forces admin to `/change-password` on first login

### Role Hierarchy

Three roles with tiered authorization:

| Role | Permissions |
|------|------------|
| `super_admin` | Full access. Can manage all users, assign/remove any role, delete admins. Seeded automatically. |
| `admin` | Admin panel access. Can manage regular users, ban/unban, invite. Cannot modify other admins. |
| `user` | Standard access. Dashboard, drawings, account settings. |

Role checks use `isAdminRole()` and `isSuperAdmin()` from `src/lib/roles.ts` — never hardcode `=== "admin"`.

### Drawing Organization

Drawings can be organized with **Projects** and **Tags**:

- **Projects**: A drawing belongs to zero or one project. Deleting a project unassigns its drawings (doesn't delete them). One-to-many relationship.
- **Tags**: A drawing can have zero or many tags. Many-to-many relationship via `DrawingTag` join table. Deleting a tag removes it from all drawings.
- **Filtering**: Dashboard supports project filter tabs (All / Unassigned / specific project) and tag filter chips (multi-select, OR logic).
- **Names**: Project and tag names are encrypted at rest with `serverEncrypt()`. Colors are stored as plaintext hex strings (not PII).

### Provider Chain

```
SessionProvider (NextAuth)
  └── MasterKeyProvider (React Context)
      └── App Content
```

### API Route Pattern

All API routes follow: auth check → authorization (ownership/role) → Zod validation → response. Drawing data is never decrypted server-side.

### Database

Prisma 7 with `@prisma/adapter-pg`. URL configured in `prisma.config.ts`, NOT in schema.prisma. Generated client outputs to `src/generated/prisma/`.

**Models**:
- **User**: E2EE key material, PIN key material, role (`user`/`admin`/`super_admin`), email verification, emailHash, encryptedEmail, ban status
- **Drawing**: encryptedName, encrypted data, IV, optional thumbnail, optional projectId
- **Project**: encryptedName, optional color, userId. `onDelete: SetNull` on drawings.
- **Tag**: encryptedName, optional color, userId
- **DrawingTag**: Join table (drawingId + tagId composite PK). `onDelete: Cascade` both sides.
- **Setting**: Key-value store for app settings (e.g., registration_enabled)

### Server-Side PII Encryption

Sensitive metadata (email addresses, drawing names, project names, tag names) is encrypted at rest using AES-256-GCM with a server-managed `ENCRYPTION_KEY`. Emails are hashed (SHA-256) for lookups via `emailHash` field, while `encryptedEmail` stores the reversible ciphertext for display. Names use `encryptedName` — the API decrypts on read and encrypts on write. See `src/lib/server-crypto.ts`.

### Editor UI

The Excalidraw editor (`/draw/[id]`) features:
- **Back button** (top-left): Returns to dashboard with unsaved changes warning
- **Save status** (top-right): Shows "Saving..." / "Saved" indicator
- **Floating bar** (bottom-center): Collapsed pill showing current drawing name + project. Expands to a panel with search, project filter chips, and scrollable drawing list with thumbnails for quick navigation.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed admin user (idempotent)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth session signing key |
| `AUTH_URL` | Yes | App URL for NextAuth callbacks |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (used in email links) |
| `REGISTRATION_ENABLED` | No | `"true"` (default) or `"false"` |
| `RESEND_API_KEY` | Yes | Resend API key for email |
| `EMAIL_FROM` | No | Sender address for emails |
| `ENCRYPTION_KEY` | Yes | AES-256-GCM key for PII encryption (hex or base64) |
| `ADMIN_EMAIL` | No | Default admin email for seed |
| `ADMIN_PASSWORD` | No | Default admin password for seed |

## Git Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/). Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`

Examples:
- `feat(auth): add email verification via Resend`
- `fix(crypto): lazy-init Resend to avoid build crash`
- `refactor(dashboard): extract drawing grid into component`
- `chore(docker): add tsx to production image for seed script`

## Key Conventions

- **Prisma 7**: Import from `@/generated/prisma/client`, NOT `@prisma/client`. Datasource URL in `prisma.config.ts` only.
- **Zod v4**: Use `error.issues[0].message`, NOT `error.errors[0]`.
- **Next.js 16**: Use `proxy.ts` for route protection, NOT `middleware.ts`. Route params are `Promise<{ id: string }>` (must be awaited).
- **Excalidraw**: Must use dynamic import with `ssr: false`.
- **Crypto**: All encryption/decryption in `src/lib/crypto.ts`. Never import crypto functions on the server.
- **Roles**: Use `isAdminRole()` / `isSuperAdmin()` from `src/lib/roles.ts` for admin checks. Never hardcode `=== "admin"`.
- **Components**: All interactive components are `"use client"`.
- **API auth**: Always call `auth()` from `@/auth` and check `session.user.id` and role via `isAdminRole()`.

## Security Rules

- Never decrypt drawing data server-side
- Never log or expose master key material in plaintext
- PII (emails, drawing names, project names, tag names) must be encrypted at rest with `ENCRYPTION_KEY`
- Email lookups must use `emailHash` (SHA-256), never query by plaintext email
- Always validate ownership: `drawing.userId === session.user.id` (also for projects and tags)
- Admin routes must check role via `isAdminRole(session.user.role)`, not `=== "admin"`
- Super admin operations must check `isSuperAdmin(session.user.role)`
- Use `REGISTRATION_ENABLED` env var to gate public signups
- Passwords hashed with bcrypt (12 rounds)
- PBKDF2 with 600,000 iterations for key derivation
- Random IVs generated fresh per encryption operation
