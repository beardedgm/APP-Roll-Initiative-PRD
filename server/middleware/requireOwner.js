import User from '../models/User.js';

export default async function requireOwner(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await User.findById(req.session.userId).select('role');
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
