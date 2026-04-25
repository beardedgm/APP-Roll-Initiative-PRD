import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

export default function Privacy() {
  return (
    <>
      <SEO
        title="Privacy Policy | Roll Initiative"
        description="Privacy Policy for Roll Initiative. Learn how we handle your data, what cookies we use, and your privacy rights."
        path="/privacy"
      />
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <h3>Account Data</h3>
            <p>
              When you register, we collect your email address, display name, and password. Your password is hashed
              using a cryptographic one-way function and is never stored in plaintext.
            </p>
            <h3>Content Data</h3>
            <p>
              We store the encounter data you create, including encounter names, combatant details (names, hit points,
              armor class, conditions), dice roll history, combat state, and round counts.
            </p>
            <h3>Payment Data</h3>
            <p>
              Payment information is processed directly by{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>. We do not
              receive or store your full credit card number, expiration date, or CVC. We store only your Stripe customer
              ID, subscription status, and billing period dates.
            </p>
            <h3>Technical Data</h3>
            <p>
              We automatically collect your IP address (used for rate limiting and logged in error reports), browser type,
              device information, and page interaction data through our analytics provider.
            </p>
            <h3>Cookies</h3>
            <p>
              We use cookies for session authentication and analytics. For full details, see our{' '}
              <a href="/cookies">Cookie Policy</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Process subscription payments and manage billing.</li>
              <li>Send transactional emails including email verification, password reset, welcome messages, and payment receipts.</li>
              <li>Monitor and fix errors and performance issues.</li>
              <li>Analyze usage patterns to improve the user experience.</li>
              <li>Enforce rate limits and protect against abuse.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Third-Party Services</h2>
            <p>
              We use the following third-party services to operate the Service. Each provider receives only the data
              necessary for their function:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Service</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Purpose</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Payment processing</td>
                  <td style={{ padding: '0.5rem' }}>Email, payment details (entered directly to Stripe)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Transactional emails</td>
                  <td style={{ padding: '0.5rem' }}>Email address, display name</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare Turnstile</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Bot protection</td>
                  <td style={{ padding: '0.5rem' }}>IP address, browser signals</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">Sentry</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Error tracking</td>
                  <td style={{ padding: '0.5rem' }}>Error data, stack traces, request metadata</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">PostHog</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Product analytics</td>
                  <td style={{ padding: '0.5rem' }}>Anonymized usage events, page views, clicks</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">Render</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Application hosting</td>
                  <td style={{ padding: '0.5rem' }}>All data transits through Render infrastructure</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <a href="https://www.mongodb.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">MongoDB Atlas</a>
                  </td>
                  <td style={{ padding: '0.5rem' }}>Database hosting</td>
                  <td style={{ padding: '0.5rem' }}>All stored data is hosted on MongoDB Atlas</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section">
            <h2>4. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. We share data only with the
              service providers listed above, solely to operate and improve the Service. We may also disclose information
              if required by law or to protect the rights, safety, or property of our users or the public.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Data Retention</h2>
            <ul>
              <li><strong>Account data:</strong> Retained while your account is active and deleted upon account deletion.</li>
              <li><strong>Encounter data:</strong> Retained while your account is active and deleted upon account deletion.</li>
              <li><strong>Email verification tokens:</strong> Automatically expire and are deleted after 60 minutes.</li>
              <li><strong>Login attempt records:</strong> Automatically expire and are deleted after 15 minutes.</li>
              <li><strong>Sessions:</strong> Automatically expire after 24 hours.</li>
              <li><strong>Stripe transaction history:</strong> Retained by Stripe per their own <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">data retention policy</a>.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Data Security</h2>
            <p>We implement the following security measures to protect your data:</p>
            <ul>
              <li>Passwords are hashed using the <code>crypto.scrypt</code> algorithm with a unique random salt per account.</li>
              <li>All connections use HTTPS encryption in production.</li>
              <li>Session cookies are set with <code>httpOnly</code> and <code>secure</code> flags in production.</li>
              <li>Sessions are regenerated on authentication events to prevent session fixation.</li>
              <li>Rate limiting is applied to authentication endpoints to prevent brute-force attacks.</li>
              <li>Bot protection (Cloudflare Turnstile) is enabled on authentication forms.</li>
            </ul>
            <p>
              While we take reasonable measures to protect your data, no method of transmission or storage is 100% secure.
              We cannot guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> View your account information in the Settings page.</li>
              <li><strong>Correction:</strong> Update your display name through the Settings page.</li>
              <li><strong>Portability:</strong> Download a JSON copy of your account, encounters, characters, and custom monsters from Settings &gt; Your Data.</li>
              <li><strong>Deletion:</strong> Delete your account and all associated data through Settings &gt; Danger Zone.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Account Deletion</h2>
            <p>
              When you delete your account through Settings &gt; Danger Zone, we permanently delete the following from
              our systems:
            </p>
            <ul>
              <li>Your user account record (email, display name, hashed password).</li>
              <li>All encounters and associated combatant and dice history data.</li>
              <li>All email verification and password reset tokens.</li>
              <li>All active sessions.</li>
              <li>Your active subscription is cancelled immediately via Stripe.</li>
            </ul>
            <p>
              Please note that third-party services may retain certain data according to their own policies. For example,
              Stripe retains transaction history, Sentry retains error logs, and Resend retains email delivery logs.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Shared Encounters</h2>
            <p>
              When you share an encounter, a unique share code is generated and the encounter data becomes publicly
              accessible in read-only mode to anyone with the share link. Shared data includes encounter name, combatant
              details, and combat state.
            </p>
            <p>
              You can revoke public access at any time by removing the share link. Once revoked, the share code is
              invalidated and the encounter is no longer publicly accessible.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed at children under the age of 13. We do not knowingly collect personal
              information from children under 13. If we become aware that we have collected personal information from a
              child under 13, we will take steps to promptly delete that information. If you believe a child under 13
              has provided us with personal information, please contact us at{' '}
              <a href="mailto:support@roll-initiative.com">support@roll-initiative.com</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. International Data Transfers</h2>
            <p>
              The Service is hosted in the United States on Render.com, and our database is hosted on MongoDB Atlas.
              If you access the Service from outside the United States, your data will be transferred to and processed in
              the United States. By using the Service, you consent to the transfer of your data to the United States.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will notify you by
              email or by posting a notice on the Service. Your continued use of the Service after such changes
              constitutes acceptance of the updated policy. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Contact</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us
              at <a href="mailto:support@roll-initiative.com">support@roll-initiative.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
