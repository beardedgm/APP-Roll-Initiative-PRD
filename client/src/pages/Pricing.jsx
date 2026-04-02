import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../api/useAuth';
import { useCreateCheckout } from '../api/useSubscription';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Pricing() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const checkout = useCreateCheckout();

  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  function handleSubscribe() {
    if (!user) {
      navigate('/register');
      return;
    }
    checkout.mutate();
  }

  return (
    <>
      <Navbar />
      <main className="pricing-page">
        <h1 className="pricing-page__title">Choose Your Path</h1>
        <p className="pricing-page__subtitle">
          A complete D&amp;D encounter tracker and Pathfinder 2e initiative tracker.
          The free tier gives you everything for local play &mdash; go premium for
          cloud saves and shared player views.
        </p>

        <div className="pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card">
            <h2 className="pricing-card__name">Free</h2>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">$0</span>
              <span className="pricing-card__period">forever</span>
            </div>
            <ul className="pricing-card__features">
              <li>Full initiative tracker (5e &amp; PF2e)</li>
              <li>Add unlimited combatants</li>
              <li>Dice roller with advantage</li>
              <li>5,700+ monsters from official SRDs</li>
              <li>Full stat blocks with clickable dice</li>
              <li>Custom monster creation</li>
              <li>Character library</li>
              <li>JSON export/import</li>
              <li>Local encounter saves</li>
              <li>Local player view (same device)</li>
              <li>Undo/redo</li>
              <li>Drag-and-drop reorder</li>
            </ul>
            <button
              className="btn btn--outline pricing-card__cta"
              onClick={() => navigate('/tracker')}
            >
              Launch Tracker
            </button>
          </div>

          {/* Premium Tier */}
          <div className="pricing-card pricing-card--featured">
            <div className="pricing-card__badge">Most Popular</div>
            <h2 className="pricing-card__name">Premium</h2>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">$6</span>
              <span className="pricing-card__period">/month</span>
            </div>
            <ul className="pricing-card__features">
              <li>Everything in Free, plus:</li>
              <li>Cloud encounter saves</li>
              <li>Cross-device sync</li>
              <li>Shareable player view links</li>
              <li>Encounter dashboard</li>
              <li>Auto-sync on changes</li>
              <li>Priority support</li>
            </ul>
            {isPremium ? (
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
