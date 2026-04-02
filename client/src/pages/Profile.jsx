import { Link } from 'react-router-dom';
import { User, Settings, Calendar } from 'lucide-react';
import { useCurrentUser } from '../api/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import '../styles/marketing.css';

export default function Profile() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="page-container"><p className="text-center">Loading...</p></div>
        <Footer />
      </>
    );
  }

  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="settings-container">
          <h1 className="settings-title"><User size={24} /> Profile</h1>

          <section className="settings-section">
            <h2 className="settings-subtitle">Account Info</h2>
            <div className="profile-field">
              <span className="profile-field__label">Display Name</span>
              <span className="profile-field__value">{user?.displayName || 'Not set'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field__label">Email</span>
              <span className="profile-field__value">{user?.email || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field__label"><Calendar size={14} /> Member Since</span>
              <span className="profile-field__value">{createdDate}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field__label">Role</span>
              <span className="profile-field__value" style={{ textTransform: 'capitalize' }}>{user?.role || 'user'}</span>
            </div>
          </section>

          <section className="settings-section">
            <Link to="/settings" className="btn btn--primary">
              <Settings size={16} /> Edit Profile &amp; Settings
            </Link>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
