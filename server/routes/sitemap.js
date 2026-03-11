import { Router } from 'express';

const router = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// In-memory rate limiter for sitemap/robots endpoints (30 req / 15 min per IP)
const sitemapRateLimitMap = new Map();
const SITEMAP_WINDOW_MS = 15 * 60 * 1000;
const SITEMAP_MAX_REQUESTS = 30;

function sitemapRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = sitemapRateLimitMap.get(ip);

  // Clean stale entries periodically (every 100 requests)
  if (sitemapRateLimitMap.size > 1000) {
    for (const [key, val] of sitemapRateLimitMap) {
      if (now - val.start > SITEMAP_WINDOW_MS) {
        sitemapRateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now - entry.start > SITEMAP_WINDOW_MS) {
    sitemapRateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }

  entry.count += 1;
  if (entry.count > SITEMAP_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  next();
}

router.get('/robots.txt', sitemapRateLimit, (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /settings\n\nSitemap: ${APP_URL}/sitemap.xml`
  );
});

router.get('/sitemap.xml', sitemapRateLimit, (req, res) => {
  const urls = ['/', '/features', '/pricing', '/tracker', '/play', '/login', '/register', '/terms', '/privacy', '/cookies'];
  const lastmod = '2026-03-10';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(path => `  <url>
    <loc>${APP_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

export default router;
