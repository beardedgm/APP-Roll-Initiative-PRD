import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', color: 'var(--color-accent-gold)', marginBottom: '0.5rem' }}>
        404
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        This page has been lost to the Shadowfell.
      </p>
      <Link
        to="/"
        style={{
          fontFamily: 'var(--font-heading)',
          padding: '0.75rem 2rem',
          background: 'var(--color-accent-gold)',
          color: 'var(--color-text-dark)',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        Return Home
      </Link>
    </div>
  );
}
