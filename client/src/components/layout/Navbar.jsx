import { useState, useEffect, useCallback, useRef } from 'react';
import { Swords, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../../api/useAuth';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
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

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  const closeMenu = useCallback(() => { setMenuOpen(false); setProfileOpen(false); }, []);

  async function handleLogout() {
    closeMenu();
    await logout.mutateAsync();
    navigate('/');
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Account';

  return (
    <nav className={`site-nav${scrolled ? ' site-nav--scrolled' : ''}`}>
      <Link to="/" className="site-nav__logo">
        <span className="site-nav__logo-icon"><Swords size={18} /></span>
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
        <li>
          <Link
            to="/help"
            onClick={closeMenu}
            className={`site-nav__link${location.pathname === '/help' ? ' site-nav__link--active' : ''}`}
          >
            Help
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
            <li className="site-nav__profile-wrapper" ref={profileRef}>
              <button
                className="site-nav__profile-toggle"
                onClick={() => setProfileOpen(o => !o)}
                aria-expanded={profileOpen}
              >
                <User size={14} />
                {displayName}
                <ChevronDown size={12} />
              </button>
              {profileOpen && (
                <ul className="site-nav__profile-dropdown">
                  <li>
                    <Link to="/profile" onClick={closeMenu} className="site-nav__dropdown-link">
                      <User size={14} /> Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/settings" onClick={closeMenu} className="site-nav__dropdown-link">
                      <Settings size={14} /> Settings
                    </Link>
                  </li>
                  <li className="site-nav__dropdown-divider" />
                  <li>
                    <button onClick={handleLogout} className="site-nav__dropdown-link site-nav__dropdown-link--danger">
                      <LogOut size={14} /> Log Out
                    </button>
                  </li>
                </ul>
              )}
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
