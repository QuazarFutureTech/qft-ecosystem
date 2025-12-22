import React, { useState, useEffect } from 'react';
import Button from '../elements/Button';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { fetchGuildRoles } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function RolePermissionManagerModule() {
  const { selectedGuildId } = useSelectedGuild();
  const { userGuilds } = useUser();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [action, setAction] = useState('add'); // 'add' or 'remove'
  const [applying, setApplying] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  useEffect(() => {
    const load = async () => {
      if (!selectedGuildId) return;
      setLoading(true);
      const token = localStorage.getItem('qft-token');
      const res = await fetchGuildRoles(selectedGuildId, token);
      setLoading(false);
      if (res.success) setRoles(res.data || []);
    };
    load();
  }, [selectedGuildId]);

  const currentGuild = userGuilds?.find(g => g.id === selectedGuildId);

  const handleApply = async () => {
    if (!memberUserId.trim() || !selectedRole) return showAlert('User ID and role required.');

    setApplying(true);
    const token = localStorage.getItem('qft-token');
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/admin/guilds/${selectedGuildId}/members/${memberUserId}/roles`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ roleId: selectedRole })
        }
      );
      const data = await response.json();
      setApplying(false);
      await showAlert(data.message || 'Role action completed.');
      if (response.ok) {
        setMemberUserId('');
        setSelectedRole('');
      }
    } catch (err) {
      setApplying(false);
      await showAlert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="qft-card">
      <h2>Role Permission Manager</h2>
      <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
        {currentGuild ? `Server: ${currentGuild.name}` : 'Select a guild in Settings'}
      </p>

      {loading ? (
        <p>Loading roles…</p>
      ) : (
        <>
          <div className="qft-field">
            <label className="qft-label" htmlFor="role-user-id">Member User ID</label>
            <input
              id="role-user-id"
              type="text"
              value={memberUserId}
              onChange={e => setMemberUserId(e.target.value)}
              className="qft-input"
              placeholder="Discord user ID"
              aria-label="Member user ID"
            />
          </div>

          <div className="qft-field">
            <label className="qft-label" htmlFor="role-select">Role</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="qft-select"
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="">Select a role…</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleApply} disabled={applying} variant="primary">
            {applying ? 'Applying…' : 'Assign Role'}
          </Button>

          {roles.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Available Roles ({roles.length})</h3>
              <ul style={{ fontSize: '0.9em', maxHeight: 200, overflowY: 'auto' }}>
                {roles.map(role => (
                  <li key={role.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <strong>{role.name}</strong> (position: {role.position})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />    </div>
  );
}
