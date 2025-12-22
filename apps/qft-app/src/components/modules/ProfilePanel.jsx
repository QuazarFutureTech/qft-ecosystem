import React, { useEffect, useRef, useState } from 'react';
import Switch from '../elements/Switch';
import './ProfilePanel.css';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { getAvatarUrl } from '../../services/user.js';

const THEMES = ['cyber', 'holographic', 'glass', 'dark', 'light'];

export default function ProfilePanel({ isOpen, onClose }) {
  const { theme, setSpecificTheme } = useTheme();
  const { userStatus, qftRole } = useUser();

  const [notifications, setNotifications] = useState({ email: false, discord: true, inapp: true });
  const [bio, setBio] = useState(userStatus?.bio || '');
  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : '/default-avatar.png';

  const overlayRef = useRef(null);

  // Load persisted preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qft-notifications');
      if (raw) setNotifications(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist notification preferences
  useEffect(() => {
    try { localStorage.setItem('qft-notifications', JSON.stringify(notifications)); } catch {}
  }, [notifications]);

  // Focus management: trap and ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    // Focus first interactive element
    const first = overlayRef.current?.querySelector('select, input, button, textarea');
    first?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAdmin = qftRole === 'admin' || qftRole === 'staff';

  return (
    <div className="profile-panel-overlay" role="dialog" aria-modal="true" aria-label="Profile panel" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="profile-title">Profile & Preferences</div>
          <button className="close-btn" onClick={onClose} aria-label="Close profile panel">Close</button>
        </header>
        <div className="panel-content">
          <section className="section" aria-labelledby="theme-section">
            <h3 id="theme-section">Theme</h3>
            <div className="field">
              <label htmlFor="theme-select">Theme selection</label>
              <select
                id="theme-select"
                className="select"
                aria-label="Theme selection"
                value={theme}
                onChange={(e) => setSpecificTheme(e.target.value)}
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="section" aria-labelledby="notif-section">
            <h3 id="notif-section">Notifications</h3>
            <div className="field">
              <Switch
                label="Email notifications"
                checked={notifications.email}
                onChange={(e) => setNotifications((n) => ({ ...n, email: e.target.checked }))}
              />
            </div>
            <div className="field">
              <Switch
                label="Discord notifications"
                checked={notifications.discord}
                onChange={(e) => setNotifications((n) => ({ ...n, discord: e.target.checked }))}
              />
            </div>
            <div className="field">
              <Switch
                label="In-app alerts"
                checked={notifications.inapp}
                onChange={(e) => setNotifications((n) => ({ ...n, inapp: e.target.checked }))}
              />
            </div>
          </section>

          <section className="section" aria-labelledby="profile-section">
            <h3 id="profile-section">Profile Info</h3>
            <div className="avatar-row">
              <img className="avatar-preview" src={avatarUrl || user?.avatar || '/default-avatar.png'} alt="Avatar preview" />
              <div style={{ flex: 1 }}>
                <div className="field">
                  <label htmlFor="avatar-url">Avatar URL</label>
                  <input id="avatar-url" className="text-input" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} aria-label="Avatar URL" />
                </div>
                <div className="actions">
                  <button className="btn" aria-label="Upload avatar">Upload</button>
                  <button className="btn" aria-label="Reset avatar" onClick={() => setAvatarUrl(user?.avatar || '')}>Reset</button>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Username</label>
              <div>{userStatus?.username || 'Guest'}</div>
            </div>
            <div className="field">
              <label>Discord Email</label>
              <div>{userStatus?.email || 'Not provided'}</div>
            </div>
            <div className="field" style={{ alignItems: 'flex-start', gap: 12 }}>
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" className="text-input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} aria-label="Editable bio" />
            </div>
            <div className="actions">
              <button className="btn primary" aria-label="Save profile">Save</button>
              <button className="btn" aria-label="Cancel changes" onClick={() => { setBio(userStatus?.bio || ''); }}>Cancel</button>
            </div>
          </section>

          <section className="section" aria-labelledby="links-section">
            <h3 id="links-section">Quick Links</h3>
            <div className="actions" role="group" aria-label="Quick access links">
              {isAdmin && (
                <>
                  <a className="btn" href="/admin" aria-label="Admin settings">Admin Settings</a>
                  <a className="btn" href="/tasks" aria-label="Task management">Task Management</a>
                  <a className="btn" href="/logs" aria-label="Logs">Logs</a>
                  <a className="btn" href="/workers" aria-label="Worker lifecycle">Worker Lifecycle</a>
                </>
              )}
              {!isAdmin && <div aria-label="No admin links">Standard account</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
