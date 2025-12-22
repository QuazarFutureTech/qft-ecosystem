import React, { useState, useEffect } from 'react';
import { FaHistory, FaFilter, FaDownload, FaSearch, FaUser, FaClock, FaServer } from 'react-icons/fa';
import { getActivityLogs, getActivityStats } from '../../services/activityLogs';
import { useUser } from '../../contexts/UserContext.jsx';
import './SystemLogsModule.css';

function SystemLogsModule() {
  const { userStatus } = useUser();
  const token = localStorage.getItem('qft-token');
  
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const actionColors = {
    create: '#28a745',
    update: '#ffc107',
    delete: '#dc3545',
    login: '#17a2b8',
    logout: '#6c757d',
    view: '#6610f2'
  };

  const resourceIcons = {
    role: '👔',
    permission: '🔐',
    user: '👤',
    module: '📦',
    command: '⚡',
    setting: '⚙️',
    bot: '🤖',
    default: '📄'
  };

  useEffect(() => {
    loadData();
  }, [filters.page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getActivityLogs(filters, token),
        getActivityStats(filters.timeframe || 7, token)
      ]);

      setLogs(logsData.logs || []);
      setTotalPages(Math.ceil((logsData.total || 0) / filters.limit));
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const applyFilters = () => {
    loadData();
  };

  const resetFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resourceType: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 50
    });
    setTimeout(() => loadData(), 100);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details'].join(','),
      ...logs.map(log => [
        log.created_at || log.timestamp || 'N/A',
        log.username || log.user_discord_id || log.user_id || 'Unknown',
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        JSON.stringify(log.details || {}).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="system-logs-module">
      <div className="logs-header">
        <div className="header-left">
          <FaHistory size={24} />
          <div>
            <h2>System Activity Logs</h2>
            <p>Real-time tracking of all system activities and user actions</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`qft-button ${showFilters ? 'active' : 'secondary'}`} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button className="qft-button secondary" onClick={exportLogs}>
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#667eea20', color: '#667eea' }}>
              <FaHistory />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_logs || 0}</div>
              <div className="stat-label">Total Activities</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#28a74520', color: '#28a745' }}>
              <FaUser />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.active_users || 0}</div>
              <div className="stat-label">Active Users Today</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ffc10720', color: '#ffc107' }}>
              <FaServer />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.actions_last_hour || 0}</div>
              <div className="stat-label">Actions (Last Hour)</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#17a2b820', color: '#17a2b8' }}>
              <FaClock />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.avg_actions_per_user || 0}</div>
              <div className="stat-label">Avg Actions/User</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-field">
              <label>User ID</label>
              <input
                type="text"
                placeholder="Filter by user ID..."
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>Action Type</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="view">View</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Resource Type</label>
              <select
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              >
                <option value="">All Resources</option>
                <option value="role">Roles</option>
                <option value="permission">Permissions</option>
                <option value="user">Users</option>
                <option value="module">Modules</option>
                <option value="command">Commands</option>
                <option value="setting">Settings</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>Results per page</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
          <div className="filters-actions">
            <button className="qft-button secondary" onClick={resetFilters}>
              Reset Filters
            </button>
            <button className="qft-button primary" onClick={applyFilters}>
              <FaSearch /> Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="logs-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading activity logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <FaHistory size={64} />
            <h3>No activity logs found</h3>
            <p>No activities match your current filters</p>
          </div>
        ) : (
          <>
            <div className="logs-table">
              <div className="table-header">
                <div className="col-time">Time</div>
                <div className="col-user">User</div>
                <div className="col-action">Action</div>
                <div className="col-resource">Resource</div>
                <div className="col-details">Details</div>
              </div>
              <div className="table-body">
                {logs.map((log, index) => (
                  <div key={index} className="log-row">
                    <div className="col-time">
                      <FaClock size={12} />
                      <span>{formatTimestamp(log.created_at || log.timestamp)}</span>
                      <span className="full-timestamp">{log.created_at || log.timestamp ? new Date(log.created_at || log.timestamp).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="col-user">
                      <FaUser size={12} />
                      <span>{log.username || `User ${log.user_discord_id || log.user_id || 'Unknown'}`}</span>
                    </div>
                    <div className="col-action">
                      <span 
                        className="action-badge" 
                        style={{ background: `${actionColors[log.action] || '#6c757d'}20`, color: actionColors[log.action] || '#6c757d' }}
                      >
                        {log.action}
                      </span>
                    </div>
                    <div className="col-resource">
                      {log.resource_type ? (
                        <>
                          <span className="resource-icon">{resourceIcons[log.resource_type] || resourceIcons.default}</span>
                          <span>{log.resource_type}</span>
                          {log.resource_id && <span className="resource-id">#{log.resource_id}</span>}
                        </>
                      ) : (
                        <span className="no-resource">—</span>
                      )}
                    </div>
                    <div className="col-details">
                      {log.details ? (
                        typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
                      ) : (
                        <span className="no-details">No additional details</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="qft-button secondary"
                  disabled={filters.page === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  className="qft-button secondary"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SystemLogsModule;
