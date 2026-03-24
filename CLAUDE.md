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
│       │   ├── layout/         # Navbar, Footer, ProtectedRoute, OwnerRoute
│       │   ├── payments/
│       │   └── ui/
│       ├── pages/
│       │   └── admin/
│       ├── store/              # Zustand stores
│       ├── hooks/
│       └── utils/
├── server/
│   ├── config/                 # DB, session, logger, Stripe, Resend, Turnstile
│   ├── models/                 # Mongoose schemas
│   ├── validators/             # Zod schemas
│   ├── middleware/
│   ├── routes/
│   ├── services/               # emailService, stripeService
│   ├── emails/                 # HTML email template functions
│   ├── utils/
│   └── __tests__/
├── scripts/
│   └── promote-owner.js
├── .github/workflows/ci.yml
├── .env.example
├── render.yaml
└── CLAUDE.md
```

---

## Dev Commands

```bash
# From repo root
cd server && npm run dev      # Express API on :5000
cd client && npm run dev      # Vite dev server on :5173

# Tests (run from /server)
npm test                      # Jest
npm run test:coverage

# Build (Render runs this on deploy)
cd client && npm run build    # Outputs to client/dist/
```

Express serves `client/dist` as static files in production. There is no separate frontend deployment.

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
- Custom X-header double-submit pattern. No CSRF token libraries.
- CORS must whitelist only the app's own origin. Never `origin: '*'` in production.

### Rate Limiting
- MongoDB sliding window collection — no Redis, no external service.
- Thresholds: login 10/15 min, registration 5/hr, password reset 3/hr, general API 100/min.
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
- Zod schemas live in `server/validators/`. One schema file per domain (auth, user, billing).
- `validate.js` middleware strips unknown fields before any route handler runs.
- Schemas can be shared with the frontend — define once, use in both places.

### Error Handling
- All async route handlers are wrapped with `asyncHandler` utility.
- `errorHandler.js` middleware is the last middleware in `app.js` and handles all thrown errors.
- Never send stack traces to the client in production.

---

## Conventions

### File Naming
- React components: `PascalCase.jsx`
- Everything else (routes, models, services, hooks, utils): `camelCase.js`

### Models
- Core models (always present): `User`, `LoginAttempt`, `EmailToken`, `ProcessedEvent`, `Session`
- TTL indexes on: `LoginAttempt` (15 min), `EmailToken` (24h for verify, 1h for reset), `ProcessedEvent` (30 days)

### API Routes
- All API routes prefixed with `/api/`
- Public: `/api/auth/*`
- Authenticated: `/api/user/*`
- Subscription-gated: `/api/app/*`
- Owner-only: `/api/admin/*`
- Stripe webhooks: `/api/billing/webhook` (raw body parser, no session/CSRF middleware)
- Sitemap mounted before the SPA catch-all

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
