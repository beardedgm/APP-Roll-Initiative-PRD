import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Privacy() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>We collect your email address, display name, and account credentials when you register. We also collect encounter data you create and usage analytics.</p>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>Your information is used to provide and improve the service, process payments, send transactional emails, and analyze usage patterns.</p>
          </section>

          <section className="legal-section">
            <h2>3. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Stripe</strong> for payment processing</li>
              <li><strong>Resend</strong> for transactional emails</li>
              <li><strong>Cloudflare Turnstile</strong> for bot protection</li>
              <li><strong>Sentry</strong> for error tracking</li>
              <li><strong>PostHog</strong> for product analytics</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Data Retention</h2>
            <p>Your data is retained while your account is active. You can delete your account and all associated data at any time from your account settings.</p>
          </section>

          <section className="legal-section">
            <h2>5. Cookies</h2>
            <p>We use session cookies to maintain your login state. See our <a href="/cookies">Cookie Policy</a> for details.</p>
          </section>

          <section className="legal-section">
            <h2>6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us or using the account deletion feature in settings.</p>
          </section>

          <section className="legal-section">
            <h2>7. Contact</h2>
            <p>For privacy-related inquiries, please contact us through the application.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
