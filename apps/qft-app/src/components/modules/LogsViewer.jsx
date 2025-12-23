import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal.jsx';
import ConfirmModal from '../elements/ConfirmModal';
import '../modules.css';

export default function LogsViewer() {
  const { qftRole } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ actionType: '', startDate: '', endDate: '' });
  const [stats, setStats] = useState([]);
  const { modalState, showAlert, closeModal } = useModal();

  const token = localStorage.getItem('qft-token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Only staff/admins can access
  if (qftRole !== 'admin' && qftRole !== 'staff') {
    return <div className="access-denied">You do not have access to logs.</div>;
  }

  useEffect(() => {
    if (selectedGuildId) {
      fetchLogs();
      fetchStats();
    }
  }, [filters, selectedGuildId]);

  const fetchLogs = async () => {
    if (!selectedGuildId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      showAlert('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedGuildId) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/logs/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data.stats || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="logs-viewer">
      <h2>Audit Logs</h2>

      <div className="logs-stats">
        <h3>Last 7 Days Summary</h3>
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.action_type} className="stat-card">
              <div className="stat-label">{stat.action_type}</div>
              <div className="stat-value">{stat.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="logs-filters">
        <input
          type="text"
          placeholder="Filter by action type"
          value={filters.actionType}
          onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
          aria-label="Filter by action type"
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          aria-label="Start date filter"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          aria-label="End date filter"
        />
        <button className="btn secondary" onClick={() => setFilters({ actionType: '', startDate: '', endDate: '' })}>
          Clear
        </button>
      </div>

      <div className="logs-list">
        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p>No logs found</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><span className="action-badge">{log.action_type}</span></td>
                  <td><code>@{log.actor_discord_id}</code></td>
                  <td>{log.target_discord_id ? <code>@{log.target_discord_id}</code> : '-'}</td>
                  <td><code className="details">{JSON.stringify(log.details).substring(0, 50)}...</code></td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
