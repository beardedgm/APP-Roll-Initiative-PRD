import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../../api/useAuth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();

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

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  async function handleLogout() {
    await logout.mutateAsync();
    navigate('/');
  }

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
            onClick={closeMenu}
            className={`site-nav__link${location.pathname === '/' ? ' site-nav__link--active' : ''}`}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/features"
            onClick={closeMenu}
            className={`site-nav__link${location.pathname === '/features' ? ' site-nav__link--active' : ''}`}
          >
            Features
          </Link>
        </li>
        {user ? (
          <>
            <li>
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className={`site-nav__link${location.pathname === '/dashboard' ? ' site-nav__link--active' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/tracker" onClick={closeMenu} className="site-nav__cta">Launch App</Link>
            </li>
            <li>
              <button onClick={() => { closeMenu(); handleLogout(); }} className="site-nav__link site-nav__link--logout">
                Log Out
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                to="/login"
                onClick={closeMenu}
                className={`site-nav__link${location.pathname === '/login' ? ' site-nav__link--active' : ''}`}
              >
                Log In
              </Link>
            </li>
            <li>
              <Link to="/tracker" onClick={closeMenu} className="site-nav__cta">Launch App</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
