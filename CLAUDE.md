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
| CSRF | Custom-header check (X-Requested-With) + strict CORS |
| Rate limiting | MongoDB sliding window (no Redis) |
| Bot protection | Cloudflare Turnstile |
| Security headers | Helmet.js |
| Payments | Stripe Checkout (hosted) + Webhooks + Customer Portal |
| Email | Resend + HTML template literals |
| Hosting | Render (single service — Express serves the built React SPA) |
| Error tracking | Sentry |
| Analytics | PostHog + Google Analytics |
| Icons | Lucide React |
| CI/CD | GitHub Actions |

---

## Repo Structure

```
/
├── client/                     # React + Vite
│   └── src/
│       ├── api/                # TanStack Query hooks (useMonsters, useSpells, useAuth, etc.) + Axios instance
│       ├── components/
│       │   ├── auth/
│       │   ├── layout/         # Navbar, Footer, ProtectedRoute, OwnerRoute, SubscriptionGate
│       │   ├── monsters/       # MonsterFormModal, ImportMonsterModal
│       │   ├── payments/
│       │   ├── player/         # PlayerViewLayout, PlayerDiceToast, InitiativeItem
│       │   ├── tracker/        # LeftPanel, CreatureList, SpellList, ContentViewer, RightPanel, DiceRoller, ShareLinkModal, etc.
│       │   └── ui/
│       ├── constants/          # monsterSources.js, pf2eSources.js, spellSources.js
│       ├── pages/
│       │   └── admin/
│       ├── store/              # Zustand stores (useCombatStore, useUserDataStore, useUIStore)
│       ├── hooks/              # useCloudSync, useUserDataSync, useEncounterCloudSetup, useUserDataInit
│       └── utils/              # monsterFormHelpers, monsterImport
├── shared/                     # Pure functions shared between Node.js and browser (no deps)
│   ├── gameSystemConfig.js     # Config-driven game system definitions (5e + PF2e labels, options, dirs)
│   ├── pf2eMarkdownRenderer.js # PF2eTools creature JSON → markdown stat block
│   ├── pf2eSpellRenderer.js    # PF2eTools spell JSON → markdown
│   ├── pf2eTagStripper.js      # Strip {@tag} template markup to plain text
│   └── *.test.js               # Node.js built-in test runner tests
├── server/
│   ├── config/                 # DB, session, logger, Stripe, Resend, Turnstile, Sentry, pf2eSourceLabels, demoMonsters
│   ├── models/                 # User, Encounter, Monster, Spell, UserData, LoginAttempt, EmailToken, ProcessedEvent
│   ├── validators/             # Zod schemas (auth, encounters, monsters, userData)
│   ├── middleware/             # requireAuth, requireOwner, requireSubscription, requireCsrf, validate, rateLimitAuth, rateLimitGeneral, verifyTurnstile, errorHandler
│   ├── routes/                 # auth, billing, encounters, health, monsters, spells, sitemap, userData
│   ├── scripts/                # seedMonsters.js, seedSpells.js
│   ├── services/               # emailService
│   └── utils/                  # asyncHandler, sessionUtils
├── scripts/
│   ├── promote-owner.js
│   ├── convertPf2eToMarkdown.js  # PF2eTools creature JSON → markdown (batch converter)
│   └── convertPf2eSpells.js      # PF2eTools spell JSON → markdown (batch converter)
├── monsters/                   # Creature markdown stat blocks (source of truth, seeded into MongoDB)
│   ├── 5e/                     # D&D 5e sources (8 folders, ~3100 files)
│   └── pf2e/                   # Pathfinder 2e sources (79 folders, ~2600 files, no pf2e_ prefix)
├── spells/                     # Spell markdown files (source of truth, seeded into MongoDB)
│   ├── 5e/                     # D&D 5e sources (4 folders, ~1540 files)
│   └── pf2e/                   # Pathfinder 2e sources (58 folders, ~2060 files, no pf2e_ prefix)
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
npm run seed:monsters         # Seed all creature markdown files (5e + PF2e) into MongoDB
npm run seed:spells           # Seed all spell markdown files (5e + PF2e) into MongoDB

# PF2e data conversion (one-time, from repo root)
npm run seed:pf2e-convert -- <path-to-pf2etools-bestiary>   # Convert PF2eTools creature JSON → markdown
npm run seed:pf2e-spells -- <path-to-pf2etools-spells-dir>  # Convert PF2eTools spell JSON → markdown

# Lint
cd server && npx eslint .     # Server lint
cd client && npm run lint     # Client lint (eslint)
cd client && npx vite build   # Client build check

# Tests
cd server && npm test         # Server unit tests (Vitest)
cd client && npm test         # Client unit tests (Vitest + jsdom) — store/hook logic
node --test shared/pf2eTagStripper.test.js        # Shared utilities (Node test runner)
node --test shared/pf2eMarkdownRenderer.test.js

# Build (Render runs this on deploy)
cd client && npm run build    # Outputs to client/dist/
```

Express serves `client/dist` as static files in production. There is no separate frontend deployment. Node >= 20 required. Server port defaults to `PORT` env var or 3000. MongoDB connection string uses `MONGO_URI` env var.

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
- Custom-header pattern via `requireCsrf.js` middleware: every state-changing request (non-GET/HEAD/OPTIONS) must carry `X-Requested-With: XMLHttpRequest`, else it gets a 403. There is no double-submit token and no `timingSafeEqual` — the request is rejected solely on the header's presence.
- Why this is safe: browsers forbid cross-origin requests from setting custom headers without a passing CORS preflight, and CORS is locked to the app's own origin — so an attacker's page cannot forge the header. The defense lives in the header requirement *combined with* strict CORS; do not loosen either.
- Mounted on all `/api/*` routes in `app.js`, except `/api/billing/webhook` (which uses Stripe signature verification).
- Axios instance sends `X-Requested-With: XMLHttpRequest` on all requests.
- CORS must whitelist only the app's own origin. Never `origin: '*'` in production.

### Rate Limiting
- MongoDB sliding window collection via `LoginAttempt` model — no Redis, no external service.
- All rate limiters use `rateLimitByIP()` from `rateLimitGeneral.js` (reuses the 15-min TTL window).
- Thresholds: login 10/15 min, registration 5/15 min, password reset 5/15 min, health/sitemap 30/15 min. The shared player-view endpoint (`/api/shared/:code`) is 1000/15 min because the player view polls it every 2s (~450 req/window per viewer) — the cap must clear real polling while still stopping floods.
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
- **Config-driven**: `shared/gameSystemConfig.js` defines all per-system behavior (labels, filter options, directory paths). Components read from `GAME_SYSTEMS[gameSystem]` instead of `isPf2e` ternaries. Adding a third system = one config entry, zero component changes.
- Single `Monster` collection with `gameSystem: '5e' | 'pf2e'` discriminator field — no separate collections.
- Single `Spell` collection with `gameSystem: '5e' | 'pf2e'` — same pattern as monsters.
- Same API endpoints with `?gameSystem=5e` or `?gameSystem=pf2e` query param (defaults to `'5e'`).
- `crNumeric` stores CR for 5e (fractional) and Level for PF2e (integer 1-25). Same field, different interpretation based on `gameSystem`.
- `initMod` derived from DEX modifier for 5e, Perception modifier for PF2e.
- `abilities` object stores ability scores (1-30) for 5e, ability modifiers (-5 to +10) for PF2e. The `gameSystem` field determines interpretation.
- Stat block display comes from `rawMarkdown` — format differences are in the markdown content, not the viewer component.
- `useUIStore.openModal(id, data)` passes `{ gameSystem }` to modals so forms know which system they're creating for.
- **File organization**: `monsters/5e/` and `monsters/pf2e/` (system parent dirs). Same for `spells/`. PF2e subfolders have no `pf2e_` prefix (e.g., `monsters/pf2e/crb/`, not `monsters/pf2e/pf2e_crb/`).
- **PF2e source labels**: `server/config/pf2eSourceLabels.js` maps source codes to full book names (shared by both seed scripts).

### Spell System Differences (5e vs PF2e)
- **5e spells**: Levels 0-9 (0 = cantrip), schools (Evocation, Conjuration, etc.), class lists (Wizard, Cleric, etc.), spell slots.
- **PF2e spells**: Ranks 1-10 (cantrip = rank 0), traditions (arcane, divine, occult, primal, elemental) instead of classes, no schools. Focus spells and ritual spells are separate categories. Uses action symbols (◆◆◆) for casting cost.
- PF2e-native fields on Spell model: `traditions`, `traits`, `actionCost`, `spellType` (spell/focus/ritual/cantrip), `rarity`.
- PF2e cantrips identified by `cantrip` trait (not Level line) — stored as `level: 0`, `spellType: 'cantrip'`.
- **5e filter flow**: Source → Level → School → Search.
- **PF2e filter flow**: Source → Rank → Category (Arcane/Divine/Occult/Primal/Elemental/Focus Spells/Ritual Spells) → Search. The Category dropdown combines traditions and spell types in one filter.
- `SpellList` remounts on system toggle via `key={gameSystem}` to reset filter state.
- Filters are config-driven from `shared/gameSystemConfig.js` — no hardcoded `isPf2e` ternaries.

### Pricing Tiers (Demo + Full Access)
- **Demo (free)**: 20 curated demo monsters (10 from 5e SRD 5.1, 10 from PF2e Bestiary 1), all spells, dice roller, local player view, localStorage persistence. No custom monsters, no character library, no cloud saves, no share links.
- **Full Access ($6/mo)**: All 5,700+ monsters, custom monster creation/import, character library, cloud encounter saves, cross-device sync, shareable player view links, encounter dashboard.
- **Server-side enforcement**: `server/config/demoMonsters.js` exports `DEMO_SLUGS` Set. `hasFullAccess(req)` helper in `server/routes/monsters.js` checks session for `owner` role or `active` subscription. Non-subscribers get `filter.slug = { $in: [...DEMO_SLUGS] }` on search, 403 on non-demo slug access, and filtered sources.
- **Client-side gating**: `CreatureList` hides Create/Import buttons and Custom source filter for non-subscribers. `LeftPanel` gates Characters and Encounters tabs behind `SubscriptionGate`.
- **Access check pattern** (used in both server routes and client components):
  ```js
  const hasFullAccess = user && (user.subscriptionStatus === 'active' || user.role === 'owner');
  ```
- **User data routes**: GET `/api/user-data` requires auth only (free users can read). PUT requires subscription (free users can't sync custom data).

### Shareable Player View Links
- `ShareLinkModal` in tracker header — generates, copies, and revokes share codes.
- Backend: `POST /api/encounters/:id/share` generates 8-char hex code, `DELETE /api/encounters/:id/share` revokes it.
- Player view: `/play/:code` route polls every 2 seconds via `useSharedEncounter(code)`. HP values stripped for security.
- Premium-only: gated by `SubscriptionGate` in the modal. Requires `cloudId` (cloud-saved encounter).

### Tracker Layout (Left/Right Panel Architecture)
- Left panel: 4 tabs — Creatures, Spells, Characters, Encounters. Each tab has a `SystemToggle` for 5E/PF2E.
- Right panel: Collapsible dice roller (persistent header bar) + `ContentViewer` for stat blocks and spell descriptions.
- `ContentViewer` reads from `useUIStore.contentStack` — a navigation stack supporting push/pop for creature→spell→back navigation. Spell names in creature stat blocks are clickable (gold dotted underline) and push onto the content stack.
- `CreatureList` shows name + CR/Level badge + source badge. `SpellList` is name-only.
- Both panels are resizable with drag handles; widths persist in localStorage.

### Shared Utilities (`shared/`)
- Pure functions with zero dependencies (no Node.js APIs, no browser APIs).
- Importable by both Node.js scripts and Vite-bundled React code.
- Client imports use relative paths: `import { fn } from '../../../shared/file.js'` — Vite resolves these without aliases.
- `pf2eTagStripper.js`: Strips PF2eTools `{@tag content}` markup to plain text.
- `pf2eMarkdownRenderer.js`: Converts PF2eTools creature JSON to markdown stat blocks.
- `pf2eSpellRenderer.js`: Converts PF2eTools spell JSON to markdown. Handles action symbols (◆◇◈), traditions, heightening, success degrees.

---

## Conventions

### File Naming
- React components: `PascalCase.jsx`
- Everything else (routes, models, services, hooks, utils): `camelCase.js`

### Models
- Core models: `User`, `LoginAttempt`, `EmailToken`, `ProcessedEvent`, `Session`
- App models: `Monster` (seeded 5e + PF2e creatures), `Spell` (seeded 5e + PF2e spells), `Encounter`, `UserData` (characters, custom monsters, encounter presets)
- `Monster.gameSystem`: `'5e'` (default) or `'pf2e'` — indexes: `{ gameSystem: 1 }`, `{ gameSystem: 1, sourceKey: 1 }`
- `Spell.gameSystem`: `'5e'` (default) or `'pf2e'` — indexes: `{ gameSystem: 1, sourceKey: 1 }`, `{ gameSystem: 1, level: 1 }`
- `Spell` fields: name, slug, level, school (5e only), classes (5e classes / PF2e traditions), castingTime, range, components, duration, traditions (PF2e), traits (PF2e), actionCost (PF2e), spellType (PF2e), rarity (PF2e), rawMarkdown
- TTL indexes on: `LoginAttempt` (15 min), `EmailToken` (24h for verify, 1h for reset), `ProcessedEvent` (30 days)

### API Routes
- All API routes prefixed with `/api/`
- Public: `/api/auth/*`, `/api/spells/*`, `/api/health`, `/api/shared/:code`
- `GET /api/health` returns `{ status, db, commit }`. `commit` is the deployed Git SHA from Render's injected `RENDER_GIT_COMMIT` env var (`'local'` off-platform) — `curl .../api/health` and compare `commit` to `git rev-parse origin/main` to confirm the latest code is live, since Render doesn't report deploys to GitHub.
- Demo-filtered (public but limited): `/api/monsters/*` — non-subscribers see only 20 demo monsters via `hasFullAccess` check
- Authenticated: `/api/billing/*`, `GET /api/user-data` (read-only for free users)
- Subscription-gated: `/api/encounters/*`, `PUT /api/user-data` (owners bypass)
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

### Icons
- Use `lucide-react` for all icons — no HTML entities or emoji.
- Common icons: `Swords` (branding), `Dices` (dice roller), `GripVertical` (drag), `X` (close), `RotateCcw` (reroll), `Shield` (player), `Skull` (monster), `User` (NPC/profile).
- Size convention: 18 for headings, 16 for buttons, 14 for inline/small, 12-13 for tight spaces.

### Logging
- Use `pino` logger from `server/config/logger.js` — never `console.log` in server code.
- `pino-pretty` in development, raw JSON in production.
- Log at `info` for normal operations, `warn` for suspicious events, `error` for exceptions.

---

## Workflow Rules

These are mandatory for every code change. No exceptions.

1. **Never push directly to `main`.** Always create a feature branch, push it, and open a PR.
2. **Run lint before every PR.** Server: `cd server && npx eslint .` Client: `cd client && npm run lint` and `cd client && npx vite build`. All must pass with zero errors.
3. **One PR per logical change.** Group related commits into a single PR with a clear title and description.
4. **Auto-seed on deploy.** `render.yaml` runs `npm run seed:monsters` and `npm run seed:spells` as part of the build command. Production re-seeds automatically on every deploy. For local development, run seed commands manually after markdown changes.
5. **Branch naming:** `feat/`, `fix/`, `style/`, `docs/` prefixes matching the change type.

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
- **Stat block markdown**: Monster/spell stat blocks are stored as `rawMarkdown` and rendered via `marked` + DOMPurify. Each bold entry must be separated by a blank line in the markdown or they render as one paragraph.
- **Clickable dice in stat blocks**: The `makeDiceClickable` function in `ContentViewer.jsx` does two passes — first wraps dice notation (e.g., `2d6+5`), then wraps standalone modifiers (e.g., `+10`) as `1d20+N` rolls. The second pass tracks open/close of dice-roll spans to avoid double-wrapping. Uses event delegation on the container ref (not direct event listeners on rendered elements) because `dangerouslySetInnerHTML` destroys DOM on re-render.
- **PF2e slug prefix**: All PF2e monster slugs start with `pf2e_` (e.g., `pf2e_b1--air-mephit`). PF2e spell slugs also start with `pf2e_` (e.g., `pf2e_crb--fireball`). The `LeftPanel.showStatBlock` method uses this prefix to route to the correct tab.
- **Slug regex must allow dots**: Slug validation regex must be `[a-z0-9._-]` not `[a-z0-9_-]` because source keys contain dots (e.g., `5.1_srd--goblin`). Missing the dot breaks stat block fetches with 400 errors.
- **Seeding env var**: The seed scripts use `MONGO_URI` (not `MONGODB_URI`). They read `.env` from `../.env` relative to `server/`. If running from a worktree, ensure the `.env` is in the worktree root.
- **Zustand v5 subscribe**: The 3-argument `subscribe(selector, listener, options)` form requires `subscribeWithSelector` middleware. Without it, callbacks silently never fire. Use the 1-argument `subscribe(listener)` form with manual reference tracking instead.
- **ContentViewer event delegation + async data**: The `useEffect` that attaches click handlers for dice and spell links must include the computed `renderedHtml` in its dependency array. When spell names load asynchronously, the HTML re-renders but the effect won't re-run unless `renderedHtml` (computed before the effect) is a dependency. Without this, dice clicks silently stop working.
- **PF2e import template `_comment` fields**: The PF2e JSON import template uses `_comment_*` keys (e.g., `_comment_top`, `_comment_traits`) as inline documentation for users. The parser ignores these — it only reads the actual data fields. Do not remove them from the template.
- **Demo monster slugs**: If the 20 demo slugs in `server/config/demoMonsters.js` are changed, the corresponding markdown files must exist in `monsters/5e/` and `monsters/pf2e/`. Verify slugs match actual filenames before changing the allowlist.

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

1. Add routes gated by `requireAuth` + `requireSubscription` (or use `hasFullAccess` pattern for public routes with tiered access).
2. Add new Mongoose models to `server/models/`.
3. Add Zod validators to `server/validators/`.
4. Add TanStack Query hooks to `client/src/api/`.
5. Add new pages to `client/src/pages/` and register them in `App.jsx`.
6. Update `robots.txt` to disallow any new authenticated routes.
7. Update `sitemap.js` if adding new public pages.
