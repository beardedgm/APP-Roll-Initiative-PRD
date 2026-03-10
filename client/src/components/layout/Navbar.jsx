import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <nav className={`site-nav${scrolled ? ' site-nav--scrolled' : ''}`}>
      <Link to="/" className="site-nav__logo">
        <span className="site-nav__logo-icon">&#9876;</span>
        Initiative Tracker
      </Link>

      <button
        className={`site-nav__toggle${menuOpen ? ' site-nav__toggle--open' : ''}`}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
      >
        <span /><span /><span />
      </button>

      <ul className={`site-nav__links${menuOpen ? ' site-nav__links--open' : ''}`}>
        <li>
          <Link
            to="/"
            className={`site-nav__link${location.pathname === '/' ? ' site-nav__link--active' : ''}`}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/features"
            className={`site-nav__link${location.pathname === '/features' ? ' site-nav__link--active' : ''}`}
          >
            Features
          </Link>
        </li>
        <li>
          <Link to="/tracker" className="site-nav__cta">Launch App</Link>
        </li>
      </ul>
    </nav>
  );
}
