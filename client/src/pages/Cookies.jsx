import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

export default function Cookies() {
  return (
    <>
      <SEO
        title="Cookie Policy | Roll Initiative"
        description="Cookie Policy for Roll Initiative. Learn about the cookies we use for authentication, analytics, and bot protection."
        path="/cookies"
      />
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <section className="legal-section">
            <h2>1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you
              visit a website. They allow the website to recognize your device and remember information about your visit,
              such as your login status and preferences. Cookies are widely used to make websites work efficiently and
              to provide information to site operators.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Cookies We Use</h2>
            <p>
              The following table describes the cookies used by Roll Initiative:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Provider</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Purpose</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}><code>connect.sid</code></td>
                  <td style={{ padding: '0.5rem' }}>Roll Initiative</td>
                  <td style={{ padding: '0.5rem' }}>Maintains your authenticated login session. This cookie is set when you log in and allows you to stay signed in as you navigate the site.</td>
                  <td style={{ padding: '0.5rem' }}>Essential</td>
                  <td style={{ padding: '0.5rem' }}>24 hours</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}><code>cf_clearance</code></td>
                  <td style={{ padding: '0.5rem' }}>Cloudflare</td>
                  <td style={{ padding: '0.5rem' }}>Set by Cloudflare Turnstile after bot verification. Proves you have successfully completed the bot check so you are not challenged again for a short period.</td>
                  <td style={{ padding: '0.5rem' }}>Essential</td>
                  <td style={{ padding: '0.5rem' }}>30 minutes</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}><code>ph_*</code></td>
                  <td style={{ padding: '0.5rem' }}>PostHog</td>
                  <td style={{ padding: '0.5rem' }}>Product analytics cookies that track anonymized usage patterns such as page views, button clicks, and feature adoption. These help us understand how the application is used so we can improve it.</td>
                  <td style={{ padding: '0.5rem' }}>Analytics</td>
                  <td style={{ padding: '0.5rem' }}>Up to 1 year</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section">
            <h2>3. Essential Cookies</h2>
            <p>
              Essential cookies are required for the core functionality of the Service. The <code>connect.sid</code> cookie
              is necessary to maintain your authenticated session, and the <code>cf_clearance</code> cookie is necessary
              for bot protection on authentication forms. These cookies cannot be disabled without breaking the
              Service&apos;s login functionality.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Analytics Cookies</h2>
            <p>
              We use <a href="https://posthog.com" target="_blank" rel="noopener noreferrer">PostHog</a> for product
              analytics with autocapture enabled. PostHog automatically tracks page views, clicks, and other user
              interactions to help us understand usage patterns and improve the application. Analytics data is collected
              in anonymized form and is not used to personally identify you.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Third-Party Cookies</h2>
            <p>
              The following third parties may set cookies when you use the Service:
            </p>
            <ul>
              <li>
                <strong>Cloudflare:</strong> Sets the <code>cf_clearance</code> cookie as part of its Turnstile bot
                protection service. For more information, see{' '}
                <a href="https://www.cloudflare.com/cookie-policy/" target="_blank" rel="noopener noreferrer">
                  Cloudflare&apos;s Cookie Policy
                </a>.
              </li>
              <li>
                <strong>PostHog:</strong> Sets analytics cookies prefixed with <code>ph_</code> to track product usage.
                For more information, see{' '}
                <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
                  PostHog&apos;s Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul>
              <li>View what cookies are stored and delete them individually.</li>
              <li>Block all cookies or only third-party cookies.</li>
              <li>Set preferences for specific websites.</li>
              <li>Configure your browser to notify you when a cookie is set.</li>
            </ul>
            <p>
              <strong>Please note:</strong> If you disable the <code>connect.sid</code> session cookie, you will not be
              able to log in or use any authenticated features of the Service. PostHog analytics cookies can be blocked
              without affecting the core functionality of the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in the cookies we use or for other
              operational, legal, or regulatory reasons. We encourage you to review this policy periodically to stay
              informed about how we use cookies.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Contact</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{' '}
              <a href="mailto:support@roll-initiative.com">support@roll-initiative.com</a>.
            </p>
            <p>
              For more information about how we handle your personal data, please see our{' '}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
