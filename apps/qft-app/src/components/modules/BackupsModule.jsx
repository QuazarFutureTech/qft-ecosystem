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
  const [backups, setBackups] = useState([]);
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
        setBackups(data.backups || []);
      } else {
        showAlert('Failed to load backups: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      showAlert('Failed to load backups');
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

  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2><FaHistory /> Server Backups</h2>
        <button className="qft-button primary" onClick={handleCreateBackup} disabled={loading}>
          <FaSave /> Create Backup
        </button>
      </div>

      <div className="module-content">
        {loading && <p>Loading...</p>}
        
        {!loading && backups.length === 0 && (
          <p className="empty-state">No backups found.</p>
        )}

        <div className="backups-list">
          {backups.map(backup => (
            <div key={backup.id} className="backup-item qft-card">
              <div className="backup-info">
                <h3>{backup.backup_name}</h3>
                <p className="meta">
                  Created: {new Date(backup.created_at).toLocaleString()} <br/>
                  Size: {formatBytes(backup.backup_size_bytes)} <br/>
                  Type: {backup.is_automated ? 'Automated' : 'Manual'}
                </p>
              </div>
              <div className="backup-actions">
                <button 
                  className="qft-button danger" 
                  onClick={() => handleRestoreBackup(backup.id)}
                  title="Restore this backup"
                >
                  <FaUndo /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
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
