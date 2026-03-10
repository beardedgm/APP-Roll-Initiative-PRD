import { Link } from 'react-router-dom';
import { useCurrentUser } from '../../api/useAuth';

export default function SubscriptionGate({ children, fallback }) {
  const { data: user } = useCurrentUser();

  const hasAccess = user && (
    user.subscriptionStatus === 'active' ||
    user.role === 'admin'
  );

  if (hasAccess) return children;

  if (fallback) return fallback;

  return (
    <div className="subscription-gate">
      <h2>Premium Feature</h2>
      <p>Cloud saves and shared player views require a premium subscription.</p>
      <Link to="/pricing" className="btn btn--primary">View Pricing</Link>
    </div>
  );
}
