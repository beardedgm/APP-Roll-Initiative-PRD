import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../api/useAuth';
import { useCreateCheckout } from '../api/useSubscription';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SEO from '../components/layout/SEO';
import '../styles/marketing.css';

export default function Pricing() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const checkout = useCreateCheckout();

  const isFullAccess = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  function handleSubscribe() {
    if (!user) {
      navigate('/register');
      return;
    }
    checkout.mutate();
  }

  return (
    <>
      <SEO
        title="Pricing — Free Demo & Full Access Plans | Roll Initiative"
        description="Try Roll Initiative free with 20 demo monsters and all 3,600+ spells. Unlock 5,700+ D&D 5e and Pathfinder 2e monsters, custom creatures, cloud saves, and shareable player view for $6/month."
        path="/pricing"
      />
      <Navbar />
      <main className="pricing-page">
        <h1 className="pricing-page__title">Choose Your Path</h1>
        <p className="pricing-page__subtitle">
          Try the demo free with 20 iconic monsters. Unlock the full library,
          cloud saves, and sharing with Full Access.
        </p>

        <div className="pricing-grid">
          {/* Demo Tier */}
          <div className="pricing-card">
            <h2 className="pricing-card__name">Demo</h2>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">$0</span>
              <span className="pricing-card__period">forever</span>
            </div>
            <ul className="pricing-card__features">
              <li>Initiative tracker (5e &amp; PF2e)</li>
              <li>20 demo monsters (10 D&amp;D 5e, 10 PF2e)</li>
              <li>All 3,600+ spells with full descriptions</li>
              <li>Built-in dice roller</li>
              <li>Local player view</li>
              <li>Undo/redo &amp; drag-and-drop</li>
            </ul>
            <button
              className="btn btn--outline pricing-card__cta"
              onClick={() => navigate('/tracker')}
            >
              Try the Demo
            </button>
          </div>

          {/* Full Access Tier */}
          <div className="pricing-card pricing-card--featured">
            <div className="pricing-card__badge">Most Popular</div>
            <h2 className="pricing-card__name">Full Access</h2>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">$6</span>
              <span className="pricing-card__period">/month</span>
            </div>
            <ul className="pricing-card__features">
              <li>Everything in Demo, plus:</li>
              <li>All 5,700+ monsters from official SRDs</li>
              <li>Custom monster creation &amp; import</li>
              <li>Character library</li>
              <li>Cloud encounter saves</li>
              <li>Cross-device sync</li>
              <li>Shareable player view links</li>
              <li>Encounter dashboard</li>
              <li>Priority support</li>
            </ul>
            {isFullAccess ? (
              <button className="btn btn--primary pricing-card__cta" disabled>
                Current Plan
              </button>
            ) : (
              <button
                className="btn btn--primary pricing-card__cta"
                onClick={handleSubscribe}
                disabled={checkout.isPending}
              >
                {checkout.isPending ? 'Redirecting...' : user ? 'Subscribe Now' : 'Create Account'}
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
