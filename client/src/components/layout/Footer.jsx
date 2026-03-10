import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <span className="site-footer__copy">&copy; 2025 Initiative Tracker &mdash; A D&amp;D Combat Tool</span>
      <ul className="site-footer__links">
        <li><Link to="/" className="site-footer__link">Home</Link></li>
        <li><Link to="/features" className="site-footer__link">Features</Link></li>
        <li><Link to="/tracker" className="site-footer__link">Launch App</Link></li>
      </ul>
    </footer>
  );
}
