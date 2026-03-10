import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Cookies() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <section className="legal-section">
            <h2>1. What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and activity.</p>
          </section>

          <section className="legal-section">
            <h2>2. Cookies We Use</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Cookie</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Purpose</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>connect.sid</td>
                  <td style={{ padding: '0.5rem' }}>Session authentication</td>
                  <td style={{ padding: '0.5rem' }}>24 hours</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>cf_clearance</td>
                  <td style={{ padding: '0.5rem' }}>Cloudflare bot protection</td>
                  <td style={{ padding: '0.5rem' }}>30 minutes</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section">
            <h2>3. Analytics</h2>
            <p>We use PostHog for product analytics. PostHog may set cookies to track anonymous usage patterns and help us improve the application.</p>
          </section>

          <section className="legal-section">
            <h2>4. Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Disabling session cookies will prevent you from logging in.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
