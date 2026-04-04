import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Roll Initiative';
const BASE_URL = 'https://rollinitiative.app';

export default function SEO({
  title,
  description,
  path = '/',
  noindex = false,
  type = 'website',
  jsonLd,
  breadcrumbs,
}) {
  const canonical = `${BASE_URL}${path}`;

  const crumbs = breadcrumbs || [
    { name: 'Home', url: BASE_URL },
    ...(path !== '/' ? [{ name: title.split(' | ')[0].split(' — ')[0], url: canonical }] : []),
  ];

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta property="twitter:card" content="summary" />
      <meta property="twitter:url" content={canonical} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />

      {!noindex && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbLd)}
        </script>
      )}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
