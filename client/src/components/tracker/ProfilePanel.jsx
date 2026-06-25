import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, LogOut } from 'lucide-react';
import { useCurrentUser, useLogout, useUpdateProfile, useChangePassword } from '../../api/useAuth';
import { useNavigate } from 'react-router-dom';

export default function ProfilePanel({ open, onClose }) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);

  const panelRef = useRef(null);

  // Close on Escape + focus trap
  useEffect(() => {
    if (!open) return;

    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap: keep Tab cycling within the panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    // Auto-focus the panel on open
    if (panelRef.current) panelRef.current.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function handleEditName() {
    setNameValue(user?.displayName || '');
    setEditingName(true);
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return;
    await updateProfile.mutateAsync({ displayName: nameValue.trim() });
    setEditingName(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ type: 'success', text: 'Password updated' });
      setCurrentPw('');
      setNewPw('');
    } catch {
      setPwMsg({ type: 'error', text: 'Failed to update password' });
    }
  }

  async function handleLogout() {
    onClose();
    await logout.mutateAsync();
    navigate('/');
  }

  if (!open) return null;

  return (
    <>
      <div className="profile-backdrop" onClick={onClose} />
      <aside className="profile-panel" ref={panelRef} tabIndex={-1}>
        <div className="profile-panel__header">
          <h2>Profile</h2>
          <button className="btn btn--icon" onClick={onClose} title="Close" aria-label="Close profile">
            <X size={16} />
          </button>
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Display Name</label>
          {editingName ? (
            <div className="profile-panel__edit-row">
              <input
                type="text"
                className="profile-panel__input"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                autoFocus
                maxLength={50}
              />
              <button className="btn btn--sm btn--primary" onClick={handleSaveName} disabled={updateProfile.isPending}>
                Save
              </button>
              <button className="btn btn--sm" onClick={() => setEditingName(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="profile-panel__edit-row">
              <span className="profile-panel__value">{user?.displayName || user?.email?.split('@')[0] || '—'}</span>
              <button className="btn btn--sm" onClick={handleEditName}>Edit</button>
            </div>
          )}
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Email</label>
          <span className="profile-panel__value">{user?.email || '—'}</span>
        </div>

        <div className="profile-panel__section">
          <label className="profile-panel__label">Change Password</label>
          <form onSubmit={handleChangePassword} className="profile-panel__pw-form">
            <input
              type="password"
              className="profile-panel__input"
              placeholder="Current password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
            />
            <input
              type="password"
              className="profile-panel__input"
              placeholder="New password (min 8 chars)"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={8}
            />
            <button className="btn btn--sm btn--primary" type="submit" disabled={changePassword.isPending}>
              Update Password
            </button>
            {pwMsg && (
              <span className={`profile-panel__msg profile-panel__msg--${pwMsg.type}`}>
                {pwMsg.text}
              </span>
            )}
          </form>
        </div>

        <div className="profile-panel__section">
          <button className="btn btn--sm" onClick={() => { onClose(); navigate('/settings'); }}>
            <ExternalLink size={14} /> Full Settings
          </button>
        </div>

        <div className="profile-panel__footer">
          <button className="btn btn--danger btn--sm" onClick={handleLogout}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
