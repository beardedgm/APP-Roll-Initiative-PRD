# CLAUDE.md

This file describes the architecture, conventions, and rules for this codebase. Read it in full before writing any code.

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Frontend | React + Vite |
| Styling | Custom CSS (Tailwind per-project if needed) |
| Client routing | React Router |
| Server state | TanStack Query |
| Client state | Zustand |
| Validation | Zod |
| Logging | pino |
| Auth | express-session + connect-mongo (session-based, HTTP-only cookies) |
| Password hashing | Node.js crypto.scrypt (built-in, no bcrypt) |
| CSRF | X-header double-submit + constant-time comparison |
| Rate limiting | MongoDB sliding window (no Redis) |
| Bot protection | Cloudflare Turnstile |
| Security headers | Helmet.js |
| Payments | Stripe Checkout (hosted) + Webhooks + Customer Portal |
| Email | Resend + HTML template literals |
| Hosting | Render (single service — Express serves the built React SPA) |
| Error tracking | Sentry |
| Analytics | PostHog |
| CI/CD | GitHub Actions |

---

## Repo Structure

```
/
├── client/                     # React + Vite
│   └── src/
│       ├── api/                # TanStack Query hooks + Axios instance
│       ├── components/
│       │   ├── auth/
│       │   ├── layout/         # Navbar, Footer, ProtectedRoute, OwnerRoute, SubscriptionGate
│       │   ├── monsters/       # MonsterFormModal, ImportMonsterModal
│       │   ├── payments/
│       │   ├── tracker/        # LeftPanel (4 tabs), MonsterDatabase, CombatantCard, DiceRoller, etc.
│       │   └── ui/
│       ├── constants/          # monsterSources.js, pf2eSources.js
│       ├── pages/
│       │   └── admin/
│       ├── store/              # Zustand stores (useCombatStore, useUserDataStore, useUIStore)
│       ├── hooks/              # useCloudSync, useUserDataSync
│       └── utils/              # monsterFormHelpers, monsterImport
├── shared/                     # Pure functions shared between Node.js and browser (no deps)
│   ├── pf2eMarkdownRenderer.js # PF2eTools JSON → markdown stat block
│   └── pf2eTagStripper.js      # Strip {@tag} template markup to plain text
├── server/
│   ├── config/                 # DB, session, logger, Stripe, Resend, Turnstile, Sentry
│   ├── models/                 # User, Encounter, Monster, UserData, LoginAttempt, EmailToken, ProcessedEvent
│   ├── validators/             # Zod schemas (auth, encounters, monsters, userData)
│   ├── middleware/             # requireAuth, requireOwner, requireSubscription, requireCsrf, validate, rateLimitAuth, rateLimitGeneral, verifyTurnstile, errorHandler
│   ├── routes/                 # auth, billing, encounters, health, monsters, sitemap, userData
│   ├── scripts/                # seedMonsters.js
│   ├── services/               # emailService
│   └── utils/                  # asyncHandler, sessionUtils
├── scripts/
│   ├── promote-owner.js
│   └── convertPf2eToMarkdown.js  # PF2eTools JSON → markdown (batch converter)
├── Monsters/                   # Markdown stat blocks (source of truth, seeded into MongoDB)
│   ├── 5.1_srd_(2015_mm)/     # D&D 5e sources (8 folders, ~3100 files)
│   ├── ...
│   └── pf2e_*/                 # Pathfinder 2e sources (79 folders, ~2600 files)
├── .github/workflows/ci.yml
├── .env.example
├── render.yaml
└── CLAUDE.md
```

---

## Dev Commands

```bash
# First-time setup
npm install                   # Root deps (concurrently)
cd client && npm install      # Frontend deps
cd server && npm install      # Backend deps

# Development (from repo root)
npm run dev                   # Runs server (:3000) + client (:5173) via concurrently
npm run dev:client            # Vite only (no backend needed for UI work)
npm run dev:server            # Express only

# Seed data (from repo root or /server)
npm run seed:monsters         # Seed all monster markdown files (5e + PF2e) into MongoDB

# PF2e data conversion (one-time, from repo root)
npm run seed:pf2e-convert -- <path-to-pf2etools-bestiary>  # Convert PF2eTools JSON → markdown

# Lint
cd server && npx eslint .     # Server lint
cd client && npx vite build   # Client build check (no separate lint command)

# Tests (shared utilities)
node --test shared/pf2eTagStripper.test.js
node --test shared/pf2eMarkdownRenderer.test.js

# Build (Render runs this on deploy)
cd client && npm run build    # Outputs to client/dist/
```

Express serves `client/dist` as static files in production. There is no separate frontend deployment. Node >= 20 required. Server port defaults to `PORT` env var or 5000.

---

## Architecture Decisions

### Auth
- **Session-based only.** No JWTs. Sessions stored in MongoDB via connect-mongo.
- Cookies: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`, 24h max age.
- `session.regenerate()` on login (prevents fixation). `session.destroy()` on logout.
- Password change invalidates all other sessions for the user.
- Password hashing uses `crypto.scrypt` with a random salt, stored as `salt:hash`.
- `timingSafeEqual` for all password and token comparisons — no string equality.

### CSRF
- Custom X-header double-submit pattern via `requireCsrf.js` middleware.
- Mounted on all `/api/*` routes in `app.js`, except `/api/billing/webhook` (which uses Stripe signature verification).
- Axios instance sends `X-Requested-With: XMLHttpRequest` on all requests.
- CORS must whitelist only the app's own origin. Never `origin: '*'` in production.

### Rate Limiting
- MongoDB sliding window collection via `LoginAttempt` model — no Redis, no external service.
- All rate limiters use `rateLimitByIP()` from `rateLimitGeneral.js` (reuses the 15-min TTL window).
- Thresholds: login 10/15 min, registration 5/15 min, password reset 5/15 min, health/sitemap/shared 30/15 min.
- TTL indexes auto-clean expired records.

### Stripe Webhooks
- Verify `stripe-signature` header on every webhook request (raw body, no JSON parsing).
- Idempotency: check `processed_events` collection by `event.id` before processing. If found, return 200 immediately. If not, process then store with 30-day TTL.
- Never rely on the checkout success redirect to provision access — always use webhooks.

### Admin / Roles
- `role` field on User model: `'user'` (default) or `'owner'`.
- No hardcoded admin emails in env vars. Role is a DB value, changeable via `scripts/promote-owner.js`.
- `requireOwner` middleware gates all `/api/admin/*` routes.

### Email
- Always check `emailBounced` and `emailSuppressed` flags before sending.
- Templates are plain JS functions returning HTML strings — no build step, no extra dependencies.
- Handle Resend bounce/complaint webhooks. Hard bounces and spam complaints suppress the address permanently.

### Validation
- Zod schemas live in `server/validators/`. One schema file per domain (auth, encounters, monsters, userData).
- `validate.js` middleware strips unknown fields before any route handler runs.
- Schemas can be shared with the frontend — define once, use in both places.

### Error Handling
- All async route handlers are wrapped with `asyncHandler` utility.
- `errorHandler.js` middleware is the last middleware in `app.js` and handles all thrown errors.
- Never send stack traces to the client in production.

### Game System Abstraction (5e + PF2e)
- Single `Monster` collection with `gameSystem: '5e' | 'pf2e'` discriminator field — no separate collections.
- Same API endpoints with `?gameSystem=5e` or `?gameSystem=pf2e` query param (defaults to `'5e'`).
- `crNumeric` stores CR for 5e (fractional) and Level for PF2e (integer 1-25). Same field, different interpretation based on `gameSystem`.
- `initMod` derived from DEX modifier for 5e, Perception modifier for PF2e.
- `abilities` object stores ability scores (1-30) for 5e, ability modifiers (-5 to +10) for PF2e. The `gameSystem` field determines interpretation.
- Stat block display comes from `rawMarkdown` — format differences are in the markdown content, not the viewer component.
- `MonsterDatabase` component accepts a `gameSystem` prop. The 5E and PF2E tabs render the same component with different props.
- `useUIStore.openModal(id, data)` passes `{ gameSystem }` to modals so forms know which system they're creating for.

### Shared Utilities (`shared/`)
- Pure functions with zero dependencies (no Node.js APIs, no browser APIs).
- Importable by both Node.js scripts and Vite-bundled React code.
- Client imports use relative paths: `import { fn } from '../../../shared/file.js'` — Vite resolves these without aliases.
- `pf2eTagStripper.js`: Strips PF2eTools `{@tag content}` markup to plain text.
- `pf2eMarkdownRenderer.js`: Converts PF2eTools creature JSON to markdown stat blocks.

---

## Conventions

### File Naming
- React components: `PascalCase.jsx`
- Everything else (routes, models, services, hooks, utils): `camelCase.js`

### Models
- Core models: `User`, `LoginAttempt`, `EmailToken`, `ProcessedEvent`, `Session`
- App models: `Monster` (seeded 5e + PF2e creatures), `Encounter`, `UserData` (characters, custom monsters, encounter presets)
- `Monster.gameSystem`: `'5e'` (default) or `'pf2e'` — indexes: `{ gameSystem: 1 }`, `{ gameSystem: 1, sourceKey: 1 }`
- TTL indexes on: `LoginAttempt` (15 min), `EmailToken` (24h for verify, 1h for reset), `ProcessedEvent` (30 days)

### API Routes
- All API routes prefixed with `/api/`
- Public: `/api/auth/*`, `/api/monsters/*`, `/api/health`, `/api/shared/:code`
- Authenticated: `/api/billing/*`
- Subscription-gated: `/api/encounters/*`, `/api/user-data/*` (owners bypass)
- Owner-only: `/api/admin/*` (gated by `requireOwner` middleware)
- Stripe webhooks: `/api/billing/webhook` (raw body parser, no session/CSRF middleware)
- Sitemap/robots.txt mounted before the SPA catch-all

### Environment Variables
- `.env.example` is committed and documents every required variable.
- `.env` is never committed.
- Production env vars are managed in Render's dashboard.
- `VITE_` prefix required for any variable accessed by the React frontend.

### Frontend API Calls
- All requests go through the Axios instance in `client/src/api/axiosInstance.js`.
- `withCredentials: true` on every request (required for session cookies).
- 401 interceptor → redirect to `/login`.
- 403 with `subscription_required` → redirect to `/pricing`.

### Logging
- Use `pino` logger from `server/config/logger.js` — never `console.log` in server code.
- `pino-pretty` in development, raw JSON in production.
- Log at `info` for normal operations, `warn` for suspicious events, `error` for exceptions.

---

## Security Rules

These are non-negotiable. Do not deviate from them.

1. Never use `origin: '*'` in CORS config.
2. Never store sessions in memory (always connect-mongo).
3. Never compare tokens or passwords with `===` — always `timingSafeEqual`.
4. Never trust the Stripe checkout success redirect to provision access — webhook only.
5. Never send to an email address where `emailBounced` or `emailSuppressed` is true.
6. Never skip Turnstile verification on public-facing forms (register, login, reset).
7. Never expose stack traces or internal error messages to the client in production.
8. Never put the `STRIPE_WEBHOOK_SECRET` on the client side.
9. Never use `findById` to authorize access to a resource — always scope queries to the authenticated user's ID.
10. Always use `asyncHandler` on route handlers — never let unhandled promise rejections reach Express.

---

## Gotchas

- **Mongoose 9 Boolean queries**: Do NOT use `{ $ne: true }` on Boolean schema fields — Mongoose 9 throws a CastError. Use `{ field: false }` instead.
- **Stat block markdown**: Monster stat blocks are stored as `rawMarkdown` and rendered via `marked` + DOMPurify. Each bold entry must be separated by a blank line in the markdown or they render as one paragraph.
- **Clickable dice in stat blocks**: The `makeDiceClickable` function in `MonsterDatabase.jsx` does two passes — first wraps dice notation (e.g., `2d6+5`), then wraps standalone modifiers (e.g., `+10`) as `1d20+N` rolls. The second pass tracks open/close of dice-roll spans to avoid double-wrapping.
- **PF2e slug prefix**: All PF2e monster slugs start with `pf2e_` (e.g., `pf2e_b1--air-mephit`). The `LeftPanel.showStatBlock` method uses this prefix to route to the correct tab.
- **Seeding from worktree**: The seed script reads `.env` from `../.env` relative to `server/`. If running from a worktree, ensure the `.env` is in the worktree root (not just the original repo).

---

## What Not to Build

- Do not add a second database (Redis, Postgres, etc.) unless there is a documented reason in this file.
- Do not switch to JWT auth — the session pattern is intentional.
- Do not add a build step for email templates — HTML template literals are the pattern.
- Do not add TypeScript unless this file is updated to reflect that decision.
- Do not add an ORM migration system — Mongoose handles schema evolution at the application layer.
- Do not create a separate deployment for the frontend — Express serves the built SPA.

---

## Adding App-Specific Features

When building features beyond the boilerplate:

1. Add routes under `/api/app/*` gated by `requireAuth` + `requireSubscription`.
2. Add new Mongoose models to `server/models/`.
3. Add Zod validators to `server/validators/`.
4. Add TanStack Query hooks to `client/src/api/`.
5. Add new pages to `client/src/pages/` and register them in `App.jsx`.
6. Update `robots.txt` to disallow any new authenticated routes.
7. Update `sitemap.js` if adding new public pages.
