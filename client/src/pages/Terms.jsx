import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Terms() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-updated">Last updated: March 2026</p>

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using Initiative Tracker, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.</p>
          </section>

          <section className="legal-section">
            <h2>2. Description of Service</h2>
            <p>Initiative Tracker is a web-based tool for managing combat encounters in tabletop role-playing games. We offer both free and premium subscription tiers.</p>
          </section>

          <section className="legal-section">
            <h2>3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
          </section>

          <section className="legal-section">
            <h2>4. Subscriptions and Billing</h2>
            <p>Premium subscriptions are billed monthly through Stripe. You may cancel at any time through your account settings. Refunds are handled on a case-by-case basis.</p>
          </section>

          <section className="legal-section">
            <h2>5. Limitation of Liability</h2>
            <p>Initiative Tracker is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
          </section>

          <section className="legal-section">
            <h2>6. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the service constitutes acceptance of the updated terms.</p>
          </section>

          <section className="legal-section">
            <h2>7. Contact</h2>
            <p>For questions about these terms, please contact us through the application.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
