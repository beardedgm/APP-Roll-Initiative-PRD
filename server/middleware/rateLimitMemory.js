// Lightweight in-memory IP rate limiter for high-traffic PUBLIC routes — the
// monster/spell catalog (finding f12).
//
// rateLimitByIP (rateLimitGeneral.js) does a Mongo countDocuments + insert on
// EVERY request; bolting that onto the hottest endpoints would add DB load, the
// opposite of the goal. This limiter touches no DB. Tradeoff: counters are
// per-process, so on a multi-instance deploy the effective cap is per-instance —
// fine as a flood cap for a public catalog (Render runs a single instance today).

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const store = new Map(); // `${action}:${ip}` -> { count, windowStart }
let lastSweep = 0;

// Amortized cleanup: sweep expired entries at most once per window, so a busy
// catalog doesn't pay an O(n) scan on every request.
function sweep(now) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) store.delete(key);
  }
}

export function rateLimitMemory(action, maxPerWindow) {
  return function (req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${action}:${ip}`;
    const now = Date.now();
    sweep(now);

    const entry = store.get(key);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
      store.set(key, { count: 1, windowStart: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxPerWindow) {
      return res.status(429).json({ error: 'Too many requests. Try again in 15 minutes.' });
    }
    next();
  };
}
