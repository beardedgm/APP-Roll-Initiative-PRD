import User from '../models/User.js';

export default async function requireSubscription(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await User.findById(req.session.userId).select('subscriptionStatus role');
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Admins bypass subscription check
  if (user.role === 'admin' || user.subscriptionStatus === 'active') {
    return next();
  }

  return res.status(403).json({ error: 'Premium subscription required' });
}
