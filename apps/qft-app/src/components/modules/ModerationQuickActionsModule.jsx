import React, { useState } from 'react';
import Button from '../elements/Button';
import Input from '../elements/Input';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { moderateUser } from '../../services/admin';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function ModerationQuickActionsModule() {
  const { selectedGuildId } = useSelectedGuild();
  const { userGuilds } = useUser();
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [action, setAction] = useState('kick');
  const [loading, setLoading] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const currentGuild = userGuilds?.find(g => g.id === selectedGuildId);

  const handleAction = async () => {
    if (!userId.trim() || !reason.trim()) return showAlert('User ID and reason required.');

    setLoading(true);
    const token = localStorage.getItem('qft-token');
    let payload = { reason };
    if (action === 'timeout') payload.minutes = minutes;

    const res = await moderateUser(selectedGuildId, userId, action, payload, token);
    setLoading(false);
    await showAlert(res.message);
    if (res.success) {
      setUserId('');
      setReason('');
    }
  };

  return (
    <div className="qft-card">
      <h2>Moderation Quick Actions</h2>
      <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
        {currentGuild ? `Server: ${currentGuild.name}` : 'Select a guild in Settings'}
      </p>

      <Input label="User ID" value={userId} onChange={e => setUserId(e.target.value)} id="mod-user-id" />

      <div className="qft-field">
        <label className="qft-label">Action</label>
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="qft-select"
          style={{ width: '100%', padding: '8px', marginBottom: 10 }}
        >
          <option value="kick">Kick</option>
          <option value="ban">Ban</option>
          <option value="timeout">Timeout</option>
        </select>
      </div>

      {action === 'timeout' && (
        <Input
          label="Duration (minutes)"
          type="number"
          value={minutes}
          onChange={e => setMinutes(Number(e.target.value))}
          id="mod-timeout-mins"
        />
      )}

      <div className="qft-field">
        <label className="qft-label">Reason</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="qft-input"
          rows={2}
          placeholder="Moderation reason…"
          aria-label="Moderation reason"
        />
      </div>

      <Button onClick={handleAction} disabled={loading} variant="primary">
        {loading ? 'Processing…' : `${action.charAt(0).toUpperCase() + action.slice(1)} User`}
      </Button>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}
