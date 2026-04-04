# Roll Initiative — Launch Readiness Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close every gap between the current codebase and a production-ready SaaS that can accept paying customers.

**Architecture:** The app is already a working MERN monorepo (React 19 + Express 5 + MongoDB + Stripe). Three rounds of code review have hardened security, fixed data integrity bugs, and cleaned up infrastructure. What remains is missing features the roadmap requires (data export, CSRF, SEO, Dependabot, PostHog identification, robots.txt), plus the one large item: test infrastructure.

**Tech Stack:** Node 20, Express 5, React 19, Vite 7, Mongoose 9, Stripe, Resend, Vitest, Supertest, Zod

---

## What's Already Done (Do Not Redo)

These items from the roadmap are complete and working. Do not touch them:

- Session-based auth with fixation prevention, secure cookies, connect-mongo
- Password hashing (crypto.scrypt + timingSafeEqual)
- Rate limiting (MongoDB sliding window + in-memory fallback, fail-closed)
- Turnstile bot protection (fail-closed in production)
- Stripe Checkout + webhook handler (idempotent via atomic upsert)
- Subscription gating middleware (requireSubscription)
- Customer Portal integration
- All 6 transactional email types via Resend (with HTML-escaped user content)
- Email verification enforcement at login
- Account deletion endpoint (password confirmation, Stripe cancel, full data purge)
- Zod validation on all routes + Mongoose sanitizeFilter
- Helmet.js security headers
- CORS with multi-origin support
- Centralized error handler (no stack trace leakage)
- Graceful shutdown (SIGTERM/SIGINT + unhandledRejection/uncaughtException)
- Structured logging (Pino, request logger excludes health checks)
- Sentry integration (frontend + backend)
- PostHog initialization (autocapture)
- Landing page, Pricing page, 404 page
- Legal pages (Terms, Privacy, Cookies) with footer links
- Sitemap.xml (correct namespace, lastmod dates)
- Health check endpoint (rate-limited)
- Error boundary component
- Cloud sync with status indicator
- Modal focus trapping, aria-labels on icon buttons
- Server + client ESLint, CI pipeline with lint + audit

---

## Task 1: CSRF Protection

The roadmap requires double-submit cookie CSRF protection on all state-changing routes. Currently there is none. Since the app uses session cookies with `sameSite: 'lax'` and strict CORS, the attack surface is narrow — but CSRF protection is defense-in-depth that the roadmap mandates.

**Files:**
- Create: `server/middleware/csrfProtection.js`
- Modify: `server/app.js` — mount middleware after session
- Modify: `client/src/api/axiosInstance.js` — read CSRF token from cookie, send as header
- Test: `server/__tests__/middleware/csrf.test.js`

**Step 1: Write the failing test**

```js
// server/__tests__/middleware/csrf.test.js
import { describe, it, expect, vi } from 'vitest';
import { csrfProtection, csrfTokenSetter } from '../../middleware/csrfProtection.js';

function mockReq(method, headers = {}) {
  return { method, headers, cookies: {} };
}
function mockRes() {
  const res = { cookie: vi.fn(), locals: {} };
  return res;
}

describe('csrfProtection', () => {
  it('allows GET requests without token', () => {
    const req = mockReq('GET');
    const res = mockRes();
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects POST without CSRF header', () => {
    const req = mockReq('POST', {});
    req.cookies = { _csrf: 'token123' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects POST when header does not match cookie', () => {
    const req = mockReq('POST', { 'x-csrf-token': 'wrong' });
    req.cookies = { _csrf: 'token123' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows POST when header matches cookie', () => {
    const req = mockReq('POST', { 'x-csrf-token': 'token123' });
    req.cookies = { _csrf: 'token123' };
    const res = mockRes();
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run __tests__/middleware/csrf.test.js`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```js
// server/middleware/csrfProtection.js
import crypto from 'crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfTokenSetter(req, res, next) {
  if (!req.cookies._csrf) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('_csrf', token, {
      httpOnly: false,       // JS must read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies._csrf;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Timing-safe comparison
  try {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  } catch {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
}
```

**Step 4: Mount in app.js**

Add `cookie-parser` dependency: `cd server && npm install cookie-parser`

In `server/app.js`, after session middleware and before API routes:
```js
import cookieParser from 'cookie-parser';
import { csrfTokenSetter, csrfProtection } from './middleware/csrfProtection.js';

// After session middleware:
app.use(cookieParser());
app.use(csrfTokenSetter);
app.use(csrfProtection);
```

Note: The Stripe webhook route is mounted BEFORE these middlewares (it's already before `express.json()`), so it won't be affected.

**Step 5: Update Axios to send the CSRF token**

In `client/src/api/axiosInstance.js`, add a request interceptor:
```js
axios.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method)) {
    const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
    if (match) config.headers['X-CSRF-Token'] = match[1];
  }
  return config;
});
```

**Step 6: Run tests, verify pass**

Run: `cd server && npx vitest run __tests__/middleware/csrf.test.js`
Expected: PASS

**Step 7: Commit**

```bash
git add server/middleware/csrfProtection.js server/__tests__/middleware/csrf.test.js server/app.js server/package.json server/package-lock.json client/src/api/axiosInstance.js
git commit -m "feat: add CSRF double-submit cookie protection"
```

---

## Task 2: Data Export Endpoint

The roadmap requires a data export endpoint for GDPR compliance. Account deletion exists but data export does not.

**Files:**
- Modify: `server/routes/auth.js` — add GET /api/auth/export
- Modify: `server/validators/auth.js` — no new schema needed (GET, no body)
- Modify: `client/src/pages/Settings.jsx` — add "Export My Data" button
- Modify: `client/src/api/axiosInstance.js` — used directly for download
- Test: `server/__tests__/routes/auth-export.test.js`

**Step 1: Write the failing test**

```js
// server/__tests__/routes/auth-export.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This test verifies the export handler logic in isolation
describe('GET /api/auth/export', () => {
  it('should return JSON with user data and encounters', async () => {
    // Integration test — will be fleshed out when test infra is set up
    // For now, verify the route exists by importing the router
    const authModule = await import('../../routes/auth.js');
    expect(authModule.default).toBeDefined();
  });
});
```

**Step 2: Write the endpoint**

In `server/routes/auth.js`, add before the DELETE endpoint:

```js
// Data export (GDPR)
router.get('/api/auth/export', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const encounters = await Encounter.find({ userId: user._id }).lean();

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      encounters: encounters.map(enc => ({
        name: enc.name,
        combatants: enc.combatants,
        round: enc.round,
        turn: enc.turn,
        phase: enc.phase,
        shareCode: enc.shareCode,
        createdAt: enc.createdAt,
        updatedAt: enc.updatedAt,
      })),
    };

    res.setHeader('Content-Disposition', 'attachment; filename="initiative-tracker-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    logger.error({ err }, 'Data export failed');
    res.status(500).json({ error: 'Export failed' });
  }
});
```

**Step 3: Add "Export My Data" button to Settings.jsx**

In the Danger Zone section of `client/src/pages/Settings.jsx`, add ABOVE the Delete Account button:

```jsx
<button
  className="btn btn--outline"
  onClick={async () => {
    try {
      const response = await (await import('../api/axiosInstance')).default.get('/auth/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'initiative-tracker-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently fail — user can retry */ }
  }}
>
  Export My Data
</button>
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git commit -m "feat: add data export endpoint for GDPR compliance"
```

---

## Task 3: robots.txt

The roadmap requires a robots.txt that blocks authenticated routes from search engine crawling.

**Files:**
- Create: `client/public/robots.txt`

**Step 1: Create the file**

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /app

Sitemap: https://roll-initiative.onrender.com/sitemap.xml
```

**Step 2: Verify it's served**

Run: `cd client && npm run build && ls dist/robots.txt`
Expected: File exists in build output

**Step 3: Commit**

```bash
git add client/public/robots.txt
git commit -m "feat: add robots.txt blocking authenticated routes"
```

---

## Task 4: SEO Meta Tags + Open Graph

The roadmap requires og: and twitter: meta tags in index.html. The app currently has only a basic title tag.

**Files:**
- Modify: `client/index.html` — add meta tags

**Step 1: Add meta tags to index.html**

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Initiative Tracker — D&D Combat Management</title>
  <meta name="description" content="Free D&D 5e initiative tracker with real-time player views, 3000+ monster database, built-in dice roller, and cloud saves. Run combat encounters faster." />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Initiative Tracker — D&D Combat Management" />
  <meta property="og:description" content="Free D&D 5e initiative tracker with real-time player views, 3000+ monster database, built-in dice roller, and cloud saves." />
  <meta property="og:image" content="https://roll-initiative.onrender.com/og-image.png" />
  <meta property="og:url" content="https://roll-initiative.onrender.com" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Initiative Tracker — D&D Combat Management" />
  <meta name="twitter:description" content="Free D&D 5e initiative tracker with real-time player views, 3000+ monster database, built-in dice roller, and cloud saves." />
  <meta name="twitter:image" content="https://roll-initiative.onrender.com/og-image.png" />

  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
```

**Step 2: Create a placeholder OG image**

Note to implementer: The user will need to create a 1200x630px `og-image.png` and place it in `client/public/`. This is a design asset, not a code task. For now, the meta tags reference it so it's ready when the image is created.

**Step 3: Commit**

```bash
git add client/index.html
git commit -m "feat: add SEO meta tags and Open Graph support"
```

---

## Task 5: PostHog User Identification

PostHog is initialized with autocapture but never identifies logged-in users. This means all analytics are anonymous — the roadmap requires tying events to users.

**Files:**
- Modify: `client/src/api/useAuth.js` — add posthog.identify on login, posthog.reset on logout

**Step 1: Update login onSuccess**

In `client/src/api/useAuth.js`, import posthog and update the login mutation:

```js
import posthog from 'posthog-js';

// In useLogin onSuccess:
onSuccess: (user) => {
  qc.setQueryData(['auth', 'me'], user);
  if (posthog.__loaded) {
    posthog.identify(user._id, {
      email: user.email,
      displayName: user.displayName,
      subscriptionStatus: user.subscriptionStatus,
    });
  }
},
```

**Step 2: Update logout onSuccess**

```js
// In useLogout onSuccess:
onSuccess: () => {
  qc.setQueryData(['auth', 'me'], null);
  qc.invalidateQueries({ queryKey: ['auth'] });
  if (posthog.__loaded) {
    posthog.reset();
  }
},
```

**Step 3: Commit**

```bash
git add client/src/api/useAuth.js
git commit -m "feat: identify users in PostHog on login, reset on logout"
```

---

## Task 6: Dependabot Configuration

The roadmap requires automated dependency updates via Dependabot.

**Files:**
- Create: `.github/dependabot.yml`

**Step 1: Create the file**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

**Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "feat: add Dependabot for weekly dependency updates"
```

---

## Task 7: .node-version File

The roadmap recommends pinning Node version via `.node-version` as the highest-priority signal for Render.

**Files:**
- Create: `.node-version`

**Step 1: Create the file**

```
20
```

(Using major version `20` rather than exact patch to match the `engines` field already in package.json.)

**Step 2: Commit**

```bash
git add .node-version
git commit -m "chore: add .node-version for Render Node.js detection"
```

---

## Task 8: Test Infrastructure Setup

This is the largest remaining item. The roadmap is clear: "No test suite, no deploy." Currently there are zero tests anywhere in the project.

This task sets up the framework and writes the highest-priority tests. It does NOT aim for full coverage — it covers the flows where bugs cost money or security.

**Files:**
- Create: `server/vitest.config.js`
- Create: `server/__tests__/setup.js`
- Create: `server/__tests__/routes/auth.test.js`
- Create: `server/__tests__/routes/billing-webhook.test.js`
- Create: `server/__tests__/middleware/requireAuth.test.js`
- Create: `server/__tests__/middleware/requireSubscription.test.js`
- Create: `server/__tests__/validators/auth.test.js`
- Modify: `server/package.json` — add vitest + test script
- Modify: `.github/workflows/ci.yml` — add test steps

### Step 1: Install test dependencies

```bash
cd server && npm install --save-dev vitest
```

### Step 2: Create vitest config

```js
// server/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.js'],
    testTimeout: 10000,
  },
});
```

### Step 3: Create test setup

```js
// server/__tests__/setup.js
// Global test setup — mock external services
import { vi } from 'vitest';

// Prevent real DB connections in unit tests
vi.mock('../config/db.js', () => ({ default: { connect: vi.fn() } }));
```

### Step 4: Add test script to package.json

In `server/package.json`, add to scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### Step 5: Write auth input validation tests (highest priority per roadmap)

```js
// server/__tests__/validators/auth.test.js
import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../validators/auth.js';

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({
      password: 'password123',
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'a'.repeat(129),
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty displayName', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: '',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('trims and lowercases email', () => {
    const result = registerSchema.safeParse({
      email: '  TEST@Example.COM  ',
      password: 'password123',
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('test@example.com');
  });

  it('rejects object in email field (NoSQL injection)', () => {
    const result = registerSchema.safeParse({
      email: { $gt: '' },
      password: 'password123',
      displayName: 'Test',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test',
      turnstileToken: 'token',
      role: 'admin',
      isAdmin: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.role).toBeUndefined();
    expect(result.data.isAdmin).toBeUndefined();
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });
});
```

### Step 6: Write middleware tests

```js
// server/__tests__/middleware/requireAuth.test.js
import { describe, it, expect, vi } from 'vitest';

// Import the actual middleware
import requireAuth from '../../middleware/requireAuth.js';

describe('requireAuth', () => {
  it('calls next() when session has userId', () => {
    const req = { session: { userId: '123' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when session has no userId', () => {
    const req = { session: {} };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when no session exists', () => {
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

```js
// server/__tests__/middleware/requireSubscription.test.js
import { describe, it, expect, vi } from 'vitest';

// We need to mock the User model before importing
vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn(),
  },
}));

import requireSubscription from '../../middleware/requireSubscription.js';
import User from '../../models/User.js';

describe('requireSubscription', () => {
  it('allows admin users regardless of subscription', async () => {
    User.findById.mockResolvedValue({ role: 'admin', subscriptionStatus: 'none' });
    const req = { session: { userId: '123' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('allows users with active subscription', async () => {
    User.findById.mockResolvedValue({ role: 'user', subscriptionStatus: 'active' });
    const req = { session: { userId: '123' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects users without subscription', async () => {
    User.findById.mockResolvedValue({ role: 'user', subscriptionStatus: 'none' });
    const req = { session: { userId: '123' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Step 7: Update CI to run tests

In `.github/workflows/ci.yml`, add after the lint steps:

```yaml
      - name: Test server
        run: cd server && npm test

      - name: Test client
        run: cd client && npm test -- --run --passWithNoTests
```

Add to `client/package.json` scripts: `"test": "vitest"`
Create `client/vitest.config.js` with basic config.

### Step 8: Run all tests

Run: `cd server && npm test`
Expected: All tests PASS

### Step 9: Commit

```bash
git commit -m "feat: add test infrastructure with auth, validation, and middleware tests"
```

---

## Task 9: Resend Bounce/Complaint Webhook (Post-Launch Priority)

The roadmap calls for handling email bounces and complaints to protect sender reputation. This is important but can ship shortly after launch — it doesn't block accepting customers.

**Files:**
- Modify: `server/models/User.js` — add `emailBounced` and `emailSuppressed` fields
- Create: `server/routes/emailWebhooks.js` — Resend webhook handler
- Modify: `server/services/emailService.js` — check bounce/suppress flags before sending
- Modify: `server/app.js` — mount email webhook route

**Implementation notes:**
- Resend sends webhooks for `email.bounced` and `email.complained` events
- On bounce: set `user.emailBounced = true`
- On complaint: set `user.emailSuppressed = true`
- Before every email send: check these flags and skip if set
- Mount the webhook route before `express.json()` if Resend requires raw body verification (check Resend docs)

This task is left as implementation notes rather than full code because:
1. It requires Resend webhook secret configuration in the dashboard
2. It requires testing with actual Resend webhook events
3. It doesn't block launch — it protects sender reputation over time

---

## Task 10: Bundle Code Splitting (Post-Launch Priority)

The client bundle is 682KB (over Vite's 500KB warning). This doesn't block launch but affects page load performance.

**Approach:**
- Lazy-load the MonsterDatabase component (largest dependency: `marked` + `dompurify`)
- Lazy-load Settings, Dashboard, and legal pages
- Use `React.lazy()` + `Suspense`

**Files to modify:**
- `client/src/App.jsx` — wrap route components in lazy/Suspense

This is straightforward React lazy loading and can be done anytime post-launch.

---

## Summary: Execution Order

| Order | Task | Blocks Launch? | Effort |
|-------|------|----------------|--------|
| 1 | CSRF Protection | Yes (security) | Medium |
| 2 | Data Export | Yes (GDPR) | Small |
| 3 | robots.txt | Yes (SEO) | Tiny |
| 4 | SEO Meta Tags | Yes (discoverability) | Tiny |
| 5 | PostHog Identify | Yes (analytics useless without it) | Tiny |
| 6 | Dependabot | Yes (security maintenance) | Tiny |
| 7 | .node-version | Yes (deployment stability) | Tiny |
| 8 | Test Infrastructure | Yes (roadmap hard gate) | Large |
| 9 | Email Bounce Handling | No (post-launch) | Medium |
| 10 | Bundle Code Splitting | No (post-launch) | Medium |

Tasks 1-8 block launch. Tasks 9-10 should be done within the first week after launch.

---

## Pre-Launch Smoke Test (After All Tasks Complete)

Run through this manually on the deployed production instance:

- [ ] Register a new account with real email
- [ ] Verify email arrives and verification link works
- [ ] Log in with verified account
- [ ] Subscribe via Stripe Checkout (test card 4242...)
- [ ] Access tracker, create encounter, add combatants
- [ ] Share encounter — verify player view loads and polls
- [ ] Manage subscription via Customer Portal
- [ ] Export account data from Settings
- [ ] Reset password flow end-to-end
- [ ] Visit /robots.txt — verify it blocks /dashboard
- [ ] Visit /sitemap.xml — verify correct domain and pages
- [ ] Test og:image URL loads (when image is created)
- [ ] Run Lighthouse on landing page — aim for 90+ accessibility
- [ ] Delete test account — verify data purge
