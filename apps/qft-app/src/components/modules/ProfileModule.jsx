import { FaUser, FaUserShield } from 'react-icons/fa';
import { getAvatarUrl, parseBadges } from '../../services/user';

function ProfileModule({ user }) {
  const avatarUrl = getAvatarUrl(user);
  const badges = parseBadges(user?.public_flags);

  return (
    <div className="qft-card">
      <h2><FaUser /> Profile</h2>

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${user.globalName || user.username}'s avatar`}
          className="guild-icon"
          style={{ borderColor: 'var(--accent-primary)' }}
        />
      ) : (
        <div className="guild-icon" style={{ borderColor: 'var(--accent-secondary)' }}>
          {user.globalName?.charAt(0) || user.username?.charAt(0)}
        </div>
      )}

      <p>Global Name: {user.globalName || user.username}</p>
      <p>UUID: {user.qftUuid}</p>
      <p>Status: {user.status}</p>

      <p>
        Role: 
        {user.isAdmin ? (
          <span className="admin-badge"><FaUserShield /> Admin</span>
        ) : (
          <span className="user-badge"><FaUser /> User</span>
        )}
      </p>

      {badges.length > 0 && (
        <p>Badges: {badges.join(', ')}</p>
      )}
    </div>
  );
}

export default ProfileModule;