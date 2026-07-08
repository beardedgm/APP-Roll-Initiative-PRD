import { Router } from 'express';
import { rateLimitByIP } from '../middleware/rateLimitGeneral.js';

const router = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

router.get('/robots.txt', rateLimitByIP('sitemap', 30), (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /settings\nDisallow: /profile\n\nSitemap: ${APP_URL}/sitemap.xml`
  );
});

router.get('/sitemap.xml', rateLimitByIP('sitemap', 30), (req, res) => {
  const urls = ['/', '/features', '/pricing', '/help', '/terms', '/privacy', '/cookies', '/licensing'];
  const lastmod = new Date().toISOString().split('T')[0];

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
