# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (start DB first, then app)
docker compose -f docker-compose.dev.yml up -d   # start PostgreSQL
npm run dev                                        # start Next.js dev server

# Database
npm run db:migrate        # create & run a new migration (prisma migrate dev)
npm run db:push           # push schema without migration (for quick iteration)
npm run db:seed           # seed admin/seller/buyer test accounts
npm run db:studio         # open Prisma Studio UI
npm run db:generate       # regenerate Prisma client after schema changes

# Build & type check
npm run build
npx tsc --noEmit          # type check without building

# Lint
npm run lint
```

## Architecture

**Stack:** Next.js 16 App Router · Prisma 7 · PostgreSQL (Docker) · NextAuth v5 · GCS · Tailwind CSS v4

### Route Groups
- `src/app/(auth)/` — login/register pages, no shared shell
- `src/app/(marketplace)/` — all buyer/seller-facing pages with `Navbar` + `Footer`
- `src/app/admin/` — admin-only dashboard with sidebar, separate layout

### Auth
- NextAuth v5 with `CredentialsProvider` (email + bcrypt)
- JWT session — `role` and `status` are embedded in the token (see `src/types/next-auth.d.ts`)
- `src/middleware.ts` is the primary access gate — guards `/admin/*`, `/dashboard/*`, `/listings/create`, and all `/api/admin/*` routes
- `requireAuth()` / `requireAdmin()` in `src/lib/auth.ts` are secondary checks inside API route handlers

### Prisma 7 Configuration
Prisma 7 split config from schema. The database URL lives in `prisma.config.ts` (not `schema.prisma`). The datasource in `schema.prisma` has no `url` field — this is intentional.

### Escrow State Machine
`src/lib/escrow.ts` exports `transitionTransaction()` — the **only** function that changes `TransactionStatus`. Never update transaction status directly via Prisma. Valid transitions:
```
PENDING_PAYMENT → IN_ESCROW → DELIVERED → COMPLETED
                                        → DISPUTED → COMPLETED (seller wins)
                                                   → REFUNDED  (buyer wins)
PENDING_PAYMENT → CANCELLED
IN_ESCROW       → CANCELLED
```
`transitionTransaction()` also sets deadline timestamps and fires notifications automatically.

### Credential Encryption
Account credentials (email/password) are encrypted with AES-256-GCM before storage (`src/lib/crypto.ts`). The `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes) never touches the database. Decryption happens only in `GET /api/transactions/[id]/credentials` and only for the buyer when status is DELIVERED/COMPLETED/DISPUTED.

### GCS Image Uploads
Images never pass through Next.js. Flow: client calls `POST /api/uploads` → server returns a signed upload URL → client uploads directly to GCS → client sends back the `gcsKey` with the listing payload. `src/lib/gcs.ts` handles signed URL generation.

### Key Files
| File | Purpose |
|---|---|
| `prisma/schema.prisma` | All DB models and enums |
| `prisma.config.ts` | Prisma 7 config — database URL lives here |
| `src/lib/auth.ts` | NextAuth config + `requireAuth`/`requireAdmin` helpers |
| `src/lib/escrow.ts` | Escrow state machine — all status transitions |
| `src/lib/crypto.ts` | AES-256-GCM encrypt/decrypt for credentials |
| `src/lib/gcs.ts` | Google Cloud Storage signed URL helpers |
| `src/middleware.ts` | Route protection choke point |

## Environment Variables

Copy `.env.example` to `.env` and fill in values before running:

```
DATABASE_URL        # postgres connection string
AUTH_SECRET         # NextAuth secret (32+ chars)
GCS_BUCKET_NAME     # GCS bucket name
GCS_PROJECT_ID      # GCP project ID
GCS_KEY_FILE        # path to service account JSON (mounted as Docker volume in prod)
ENCRYPTION_KEY      # 64 hex chars (openssl rand -hex 32)
POSTGRES_USER/PASSWORD/DB  # used by docker-compose
```

## Docker

```bash
# Dev: only the DB runs in Docker, app runs locally
docker compose -f docker-compose.dev.yml up -d

# Production: full stack
docker compose up -d
```

Production image uses multi-stage build with `output: "standalone"` in `next.config.ts`.

## Test Accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eshabiki.com | admin123! |
| Seller | seller@eshabiki.com | seller123! |
| Buyer | buyer@eshabiki.com | buyer123! |
