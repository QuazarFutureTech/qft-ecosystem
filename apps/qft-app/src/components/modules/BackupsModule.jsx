import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal.jsx';
import ConfirmModal from '../elements/ConfirmModal';
import { FaSave, FaUndo, FaHistory, FaDownload } from 'react-icons/fa';
import '../modules.css';

export default function BackupsModule() {
  const { qftRole } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const [backup, setBackup] = useState(null);
  const [loading, setLoading] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const token = localStorage.getItem('qft-token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (selectedGuildId) fetchBackups();
  }, [selectedGuildId]);

  const fetchBackups = async () => {
    if (!selectedGuildId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/backups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBackup(data.backup || null);
      } else {
        showAlert('Failed to load backup: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('Error fetching backup:', error);
      showAlert('Failed to load backup');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedGuildId) return;
    const confirmed = await showConfirm('Create a new server backup? This will save roles, channels, and settings.');
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Backup created successfully!');
        fetchBackups();
      } else {
        showAlert('Error creating backup: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      showAlert('Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    const confirmed = await showConfirm('WARNING: Restoring a backup may overwrite current server settings, roles, and channels. Are you sure?');
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/backups/${backupId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Restore process initiated. Check server logs for progress.');
      } else {
        showAlert('Error restoring backup: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      showAlert('Error restoring backup');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Helper: Download backup as JSON
  const handleDownloadBackup = () => {
    if (!backup) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `guild-backup-${selectedGuildId}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Only allow admin roles to use controls
  const isAdmin = qftRole === 'admin' || qftRole === 'owner' || qftRole === 'system';

  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2><FaHistory /> Server Backup</h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="qft-button primary" onClick={handleCreateBackup} disabled={loading} title="Create a new backup">
              <FaSave /> Create Backup
            </button>
            <button className="qft-button" onClick={handleDownloadBackup} disabled={!backup} title="Download backup as JSON">
              <FaDownload /> Download
            </button>
            <button className="qft-button danger" onClick={() => backup && handleRestoreBackup(selectedGuildId)} disabled={!backup || loading} title="Restore this backup">
              <FaUndo /> Restore
            </button>
          </div>
        )}
      </div>

      <div className="module-content">
        {loading && <p>Loading...</p>}
        {!loading && !backup && (
          <p className="empty-state">No backup found for this server.</p>
        )}
        {!loading && backup && (
          <div className="backup-details qft-card">
            <div className="backup-header">
              {backup.icon && <img src={backup.icon} alt="Guild Icon" style={{width: 64, height: 64, borderRadius: 8, marginRight: 16}} />}
              <div>
                <h3>{backup.name}</h3>
                <p className="meta">
                  Created: {backup.createdAt ? new Date(backup.createdAt).toLocaleString() : 'N/A'}<br/>
                  Channels: {backup.channels ? backup.channels.length : 0} | Roles: {backup.roles ? backup.roles.length : 0}
                </p>
                {backup.description && <p>{backup.description}</p>}
              </div>
            </div>
            <div className="backup-section">
              <h4>Roles</h4>
              <ul>
                {backup.roles && backup.roles.length > 0 ? backup.roles.map((role, idx) => (
                  <li key={idx}>{role.name} (Color: #{role.color?.toString(16)})</li>
                )) : <li>No roles found.</li>}
              </ul>
            </div>
            <div className="backup-section">
              <h4>Channels</h4>
              <ul>
                {backup.channels && backup.channels.length > 0 ? backup.channels.map((ch, idx) => (
                  <li key={idx}>{ch.name} ({ch.type})</li>
                )) : <li>No channels found.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
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
