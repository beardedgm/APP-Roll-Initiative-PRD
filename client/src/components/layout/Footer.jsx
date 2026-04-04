import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <span className="site-footer__copy">&copy; {new Date().getFullYear()} Roll Initiative &mdash; A D&amp;D &amp; Pathfinder 2e Combat Tool</span>
      <ul className="site-footer__links">
        <li><Link to="/" className="site-footer__link">Home</Link></li>
        <li><Link to="/features" className="site-footer__link">Features</Link></li>
        <li><Link to="/tracker" className="site-footer__link">Launch App</Link></li>
        <li><Link to="/terms" className="site-footer__link">Terms</Link></li>
        <li><Link to="/privacy" className="site-footer__link">Privacy</Link></li>
      </ul>
    </footer>
  );
}
