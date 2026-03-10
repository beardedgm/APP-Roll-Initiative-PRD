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
            <p>
              By accessing or using Initiative Tracker (&quot;the Service&quot;), operated at{' '}
              <a href="https://roll-initiative.onrender.com">roll-initiative.onrender.com</a>, you agree to be bound by
              these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the Service.
            </p>
            <p>
              You must be at least 13 years of age to use this Service. By using the Service, you represent and warrant
              that you are at least 13 years old. If you are under 18, you represent that you have your parent or
              guardian&apos;s permission to use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Description of Service</h2>
            <p>
              Initiative Tracker is a web-based tool for managing combat encounters in tabletop role-playing games such as
              Dungeons &amp; Dragons. The Service provides:
            </p>
            <ul>
              <li><strong>Free tier:</strong> Browse the monster compendium, use the local initiative tracker, and access basic features without an account.</li>
              <li><strong>Premium subscription:</strong> Cloud-saved encounters, unlimited encounter storage, shareable encounter links, and additional premium features.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Account Registration</h2>
            <p>
              To access certain features, you must create an account by providing a valid email address, a display name,
              and a password. You agree to:
            </p>
            <ul>
              <li>Provide accurate and complete registration information.</li>
              <li>Keep your account credentials confidential and secure.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
              <li>Maintain only one account per person.</li>
            </ul>
            <p>
              You are responsible for all activity that occurs under your account, whether or not you authorized it.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Subscription and Billing</h2>
            <p>
              Premium subscriptions are billed on a monthly basis and processed through{' '}
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">Stripe</a>. By subscribing, you
              authorize us to charge your payment method on a recurring monthly basis until you cancel.
            </p>
            <ul>
              <li><strong>Auto-renewal:</strong> Your subscription automatically renews each month unless you cancel before the end of the current billing period.</li>
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time through Settings &gt; Manage Subscription. Upon cancellation, you will retain access to premium features until the end of your current billing period.</li>
              <li><strong>Refunds:</strong> Refund requests are handled on a case-by-case basis. To request a refund, contact us at <a href="mailto:support@roll-initiative.com">support@roll-initiative.com</a>.</li>
              <li><strong>Price changes:</strong> We may change subscription pricing with reasonable advance notice. Continued use after a price change constitutes acceptance of the new price.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. User Content</h2>
            <p>
              &quot;User Content&quot; refers to encounter data, combatant details, dice history, and any other content
              you create or upload through the Service.
            </p>
            <ul>
              <li><strong>Ownership:</strong> You retain all ownership rights to your User Content.</li>
              <li><strong>License:</strong> By using the Service, you grant us a limited, non-exclusive license to host, store, display, and transmit your User Content solely for the purpose of providing the Service to you.</li>
              <li><strong>Shared encounters:</strong> When you generate a share link for an encounter, the encounter data becomes publicly accessible in read-only mode to anyone with the link. You may revoke public access at any time by removing the share link.</li>
              <li><strong>Responsibility:</strong> You are solely responsible for your User Content and must not upload content that infringes on the intellectual property rights of others.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Scrape, crawl, or use automated tools to access the Service without our prior written consent.</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or related systems.</li>
              <li>Abuse share codes or encounter sharing features to distribute harmful or offensive content.</li>
              <li>Interfere with or disrupt the Service, servers, or networks connected to the Service.</li>
              <li>Circumvent or disable any security features of the Service, including bot protection measures.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Intellectual Property</h2>
            <p>
              The Service, including its design, code, features, and branding, is owned by Initiative Tracker and
              protected by applicable intellectual property laws. You may not copy, modify, distribute, or create
              derivative works based on the Service without our express permission.
            </p>
            <p>
              Dungeons &amp; Dragons and related properties are trademarks of Wizards of the Coast. Initiative Tracker is
              an independent tool and is not affiliated with, endorsed by, or sponsored by Wizards of the Coast. All game
              content referenced within the Service is used under the Open Gaming License or System Reference Document
              where applicable.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage
              in conduct that we determine, in our sole discretion, is harmful to the Service or other users.
            </p>
            <p>
              You may delete your account at any time through Settings &gt; Danger Zone. Upon account deletion:
            </p>
            <ul>
              <li>All your encounter data, sessions, and account information will be permanently deleted from our systems.</li>
              <li>Any active subscription will be cancelled immediately.</li>
              <li>Third-party services (such as Stripe) may retain transaction history per their own data retention policies.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              whether express or implied, including but not limited to implied warranties of merchantability, fitness for
              a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
              error-free, or secure, or that any defects will be corrected.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Initiative Tracker and its operators shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or
              goodwill, arising out of or related to your use of or inability to use the Service.
            </p>
            <p>
              Our total liability for any claims arising under these Terms shall not exceed the total amount you have
              paid to us in subscription fees during the twelve (12) months immediately preceding the event giving rise
              to the claim.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Initiative Tracker and its operators from and against any
              claims, liabilities, damages, losses, and expenses (including reasonable attorney&apos;s fees) arising out
              of or relating to your use of the Service, your violation of these Terms, or your violation of any rights
              of a third party.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              United States, without regard to its conflict of law provisions. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the state and federal courts located in Delaware.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. When we make material changes, we will notify you by email
              or by posting a notice on the Service. Your continued use of the Service after such changes constitutes
              your acceptance of the updated Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@roll-initiative.com">support@roll-initiative.com</a>.
            </p>
            <p>
              For information about how we handle your data, please see our{' '}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
