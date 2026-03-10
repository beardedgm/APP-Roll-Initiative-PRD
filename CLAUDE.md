# Initiative Tracker

D&D 5e initiative tracker SaaS — DM and player views, cloud saves, 3000+ monster database, Stripe billing.

## Project Structure

Monorepo with root `package.json` orchestrating two subdirectories:

```
client/          React 19 + Vite 7 + Zustand + React Query (port 5173)
server/          Express 5 + Mongoose 9 + Stripe + Resend (port 3000)
monsters/        3000+ monster stat blocks in markdown (8 sources)
```

### Key Files
- `server/app.js` — Express entry point, middleware order matters (webhook raw body → json → session → routes)
- `server/config/` — db.js, session.js, stripe.js, logger.js (Pino)
- `server/routes/` — auth, encounters, monsters, billing, health, sitemap
- `server/middleware/` — requireAuth, requireSubscription, rateLimitAuth, validate, requestLogger
- `server/validators/` — Zod schemas for auth and encounters
- `server/models/` — User, Encounter, Monster, EmailToken, LoginAttempt, ProcessedEvent
- `client/src/store/` — useCombatStore.js (core state + undo/redo), useUIStore.js (modals)
- `client/src/api/` — axiosInstance.js (baseURL: /api, 10s timeout), React Query hooks
- `client/src/hooks/` — useCloudSync (debounced 500ms auto-sync to API)

## Deployment (Render.com)

**IMPORTANT**: Render dashboard overrides `render.yaml`. Build/start commands and env vars are configured in the dashboard, NOT from the yaml file.

- **Service URL**: https://roll-initiative.onrender.com
- **Build command (dashboard)**: `npm install; npm run build`
- **Start command (dashboard)**: `cd server; node app.js`
- **Root `build` script** installs subdirectory deps: `cd client && npm install --include=dev && npm run build && cd ../server && npm install`
- **`NODE_ENV=production`** causes `npm install` to skip devDependencies. Client needs `--include=dev` because `vite` is a devDependency.
- **Env vars** must be set manually in Render dashboard — render.yaml `sync: false` vars are not auto-applied
- **Port**: Render sets `PORT` automatically; server reads `process.env.PORT || 5000`
- **Static serving**: `server/app.js` serves `client/dist/` only when `NODE_ENV === 'production'`

### Required Render Environment Variables
```
NODE_ENV=production
SESSION_SECRET        (auto-generated or manual)
MONGO_URI             (MongoDB Atlas connection string)
APP_URL               (e.g., https://roll-initiative.onrender.com)
APP_NAME              (Initiative Tracker)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_MONTHLY
RESEND_API_KEY
EMAIL_FROM            (e.g., "HexPlora <noreply@hexplora.app>")
TURNSTILE_SECRET_KEY
SENTRY_DSN
VITE_POSTHOG_KEY
VITE_POSTHOG_HOST
```

## Local Development

```bash
npm run dev            # concurrently runs client (5173) and server (3000)
npm run seed:monsters  # seed 3000+ monsters into MongoDB from monsters/ directory
```

Client Vite config proxies `/api` requests to `http://localhost:3000`.

## Key Conventions

- **Logger**: Always use Pino (`import logger from '../config/logger.js'`), never `console.log/error`
- **Validation**: Zod schemas in `server/validators/`, applied via `validate()` middleware
- **Auth**: Session-based (express-session + connect-mongo), cookie `httpOnly`, `secure` in prod
- **Stripe webhooks**: Need raw body — `webhookRouter` is mounted BEFORE `express.json()` in app.js
- **Idempotency**: Stripe webhook events tracked in `ProcessedEvent` model to prevent double-processing
- **Password hashing**: `crypto.scrypt` with random 16-byte salt, timing-safe comparison
- **State persistence**: Zustand `persist` middleware saves to localStorage key `dnd_initiative_state`
- **Cloud sync**: `useCloudSync` hook debounces store changes (500ms) and PUTs to `/api/encounters/:id`
- **Shared encounters**: Player view polls `GET /api/shared/:code` every 2 seconds via React Query
- **ID format**: Combatant IDs = `combatant_{timestamp}_{random}`, Encounter IDs = `enc_{timestamp}_{random}`
- **Migration**: `client/src/utils/migration.js` handles upgrading pre-MERN localStorage state to current schema

## API Routes

| Route | Auth | Description |
|-------|------|-------------|
| `POST /api/auth/register,login,logout` | No/No/No | Auth flow |
| `GET /api/auth/me` | No (returns null) | Current user |
| `POST /api/auth/verify-email,forgot-password,reset-password,change-password` | Varies | Account management |
| `GET /api/monsters/search,sources,:slug` | No | Public monster database |
| `GET/POST/PUT/DELETE /api/encounters` | Auth+Sub | CRUD (subscription required) |
| `POST/DELETE /api/encounters/:id/share` | Auth+Sub | Share code management |
| `GET /api/shared/:code` | No | Public shared encounter |
| `POST /api/billing/create-checkout-session,create-portal-session` | Auth | Stripe billing |
| `GET /api/billing/status` | Auth | Subscription status |
| `POST /api/billing/webhook` | Stripe sig | Stripe webhooks |
| `GET /api/health` | No | DB health check |

## Render Deployment Checklist (for new projects)

Use this checklist when preparing any MERN monorepo for Render.

### Build Script
- [ ] Root `build` script must install deps for ALL subdirectories (`cd client && npm install && ...`)
- [ ] Use `--include=dev` for any subdirectory whose build tools (vite, webpack, tsc) are in devDependencies
- [ ] Test the full build locally with `NODE_ENV=production npm run build` before deploying

### Express 5 Gotchas
- [ ] Catch-all routes must use named wildcards: `'{*path}'` not `'*'` (path-to-regexp v8 requirement)
- [ ] Stripe/webhook routes needing raw body must be mounted BEFORE `express.json()` middleware

### Static File Serving
- [ ] SPA fallback (`res.sendFile('index.html')`) must be gated on `NODE_ENV === 'production'`
- [ ] Verify the static path resolves correctly: `path.join(__dirname, '../client/dist')` depends on where the start command runs from

### Environment Variables
- [ ] `NODE_ENV=production` must be set in Render dashboard (affects npm install behavior and static serving)
- [ ] All env vars must be set manually in Render dashboard — `render.yaml` `sync: false` vars are NOT auto-applied
- [ ] Session secrets should be generated (not hardcoded fallbacks that silently work in production)
- [ ] `APP_URL` must match the actual Render service URL (used for CORS, email links, Stripe redirects)
- [ ] `VITE_*` env vars must be set at BUILD time (baked into the client bundle), not just at runtime

### Render Dashboard vs render.yaml
- [ ] Dashboard settings OVERRIDE render.yaml — if you configure in dashboard, render.yaml is ignored for those settings
- [ ] Pick one source of truth: either manage everything in dashboard or everything in render.yaml
- [ ] If using dashboard: build command is typically `npm install; npm run build` (root scripts handle the rest)

### Pre-Deploy Verification
- [ ] Run `NODE_ENV=production npm run build` locally to catch build errors
- [ ] Run `NODE_ENV=production node server/app.js` locally to catch startup crashes
- [ ] Verify `/api/health` endpoint exists for Render health checks
- [ ] Ensure server binds to `process.env.PORT` (Render sets this automatically)

## Known Issues (from code review)

- Rate limiting only on `/api/auth/login`, not register/forgot-password
- Session not invalidated on password change/reset
- Email enumeration possible via register endpoint (409 response)
- `requireSubscription` middleware missing try/catch
- No React error boundaries
- `console.error` used in `server/routes/monsters.js` instead of logger
- TrackerHeader has 11 separate Zustand subscriptions (should use useShallow)
- `diceHistory` validator uses `z.any()` instead of proper schema
