import { Router } from 'express';

const router = Router();

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /settings\n\nSitemap: ${APP_URL}/sitemap.xml`
  );
});

router.get('/sitemap.xml', (req, res) => {
  const urls = ['/', '/features', '/pricing', '/tracker', '/play', '/login', '/register'];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">
${urls.map(path => `  <url>
    <loc>${APP_URL}${path}</loc>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
});

export default router;
