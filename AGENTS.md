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
│   │   └── page.tsx            # Drawing grid with CRUD
│   ├── draw/[id]/page.tsx      # Excalidraw editor
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Stats + user management
│   ├── change-password/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   ├── register/route.ts
│       │   ├── verify/route.ts
│       │   └── change-password/route.ts
│       ├── drawings/
│       │   ├── route.ts        # GET list, POST create
│       │   └── [id]/route.ts   # GET, PUT, DELETE
│       └── admin/
│           ├── stats/route.ts
│           └── users/
│               ├── route.ts
│               └── [id]/route.ts
├── components/
│   ├── providers.tsx           # SessionProvider + MasterKeyProvider
│   ├── ExcalidrawEditor.tsx    # Dynamic import, ssr: false
│   ├── DrawingCard.tsx
│   ├── CreateDrawingDialog.tsx
│   ├── DeleteDrawingDialog.tsx
│   ├── UnlockModal.tsx
│   ├── AuthForm.tsx
│   └── Navbar.tsx
├── hooks/
│   ├── useMasterKey.ts         # React context for CryptoKey
│   ├── useAutoSave.ts          # Debounced encrypt + save
│   └── useDrawing.ts           # Load + decrypt / encrypt + save
├── lib/
│   ├── prisma.ts               # PrismaClient singleton (PrismaPg adapter)
│   ├── crypto.ts               # E2EE functions (client-side only)
│   ├── server-crypto.ts        # Server-side AES-256-GCM for PII (email, drawing names)
│   ├── email.ts                # Resend email service
│   └── constants.ts
├── auth.ts                     # NextAuth config
├── proxy.ts                    # Route protection (replaces middleware in Next.js 16)
└── types/
    └── next-auth.d.ts          # Session/JWT type augmentations
prisma/
├── schema.prisma
└── seed.ts                     # Idempotent admin user seed
```

## Architecture

### E2EE Model

All crypto runs in the browser via Web Crypto API. The server stores only ciphertext.

- **Registration**: Generate 256-bit AES-GCM master key → derive wrapping key from password (PBKDF2, SHA-256, 600k iterations) → encrypt master key → store encrypted key + salt + IV on server
- **Login**: JWT session embeds encrypted key material → client derives wrapping key from password → decrypts master key → held in React context (memory only)
- **Save drawing**: Serialize scene → random 12-byte IV → AES-GCM encrypt → PUT to API
- **Load drawing**: GET encrypted blob → AES-GCM decrypt → render in Excalidraw
- **Page refresh**: Master key lost. UnlockModal prompts password to re-derive

### Auth Flow

- NextAuth v5 Credentials provider with bcrypt password hashing
- JWT sessions carry encrypted master key material + user role
- Email verification required before login (via Resend)
- `proxy.ts` protects routes (Next.js 16 proxy convention, replaces middleware)
- Admin users redirect to `/admin`, regular users to `/dashboard`
- `mustChangePassword` flag forces admin to `/change-password` on first login

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

**Models**: User (with E2EE key material, role, email verification, emailHash for lookups, encryptedEmail for display) and Drawing (encryptedName, encrypted data, IV, optional thumbnail). Cascade delete on user removal.

### Server-Side PII Encryption

Sensitive metadata (email addresses, drawing names) is encrypted at rest using AES-256-GCM with a server-managed `ENCRYPTION_KEY`. Emails are hashed (SHA-256) for lookups via `emailHash` field, while `encryptedEmail` stores the reversible ciphertext for display. Drawing names use `encryptedName` — the API decrypts on read and encrypts on write. See `src/lib/server-crypto.ts`.

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
- **Components**: All interactive components are `"use client"`.
- **API auth**: Always call `auth()` from `@/auth` and check `session.user.id` and `session.user.role`.

## Security Rules

- Never decrypt drawing data server-side
- Never log or expose master key material in plaintext
- PII (emails, drawing names) must be encrypted at rest with `ENCRYPTION_KEY`
- Email lookups must use `emailHash` (SHA-256), never query by plaintext email
- Always validate ownership: `drawing.userId === session.user.id`
- Admin routes must check `session.user.role === "admin"`
- Use `REGISTRATION_ENABLED` env var to gate public signups
- Passwords hashed with bcrypt (12 rounds)
- PBKDF2 with 600,000 iterations for key derivation
- Random IVs generated fresh per encryption operation
