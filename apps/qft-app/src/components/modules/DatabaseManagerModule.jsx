import React, { useState, useEffect } from 'react';
import './DatabaseManagerModule.css';
import { useModalLock } from '../../hooks/useModalLock.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DatabaseManagerModule = () => {
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // overview, table, query
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  
  // Confirmation states
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showTruncateConfirm, setShowTruncateConfirm] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [processing, setProcessing] = useState(false);

  useModalLock(showPurgeConfirm || showTruncateConfirm);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('qft-token');

      const [tablesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/database/tables`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/v1/database/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!tablesRes.ok || !statsRes.ok) {
        throw new Error('Failed to load database information');
      }

      const tablesData = await tablesRes.json();
      const statsData = await statsRes.json();

      setTables(tablesData.tables || []);
      setStats(statsData.stats || null);
    } catch (err) {
      setError(err.message);
      console.error('Database info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetails = async (tableName) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('qft-token');

      const [dataRes, schemaRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/database/tables/${tableName}/data?limit=50&offset=0`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/v1/database/tables/${tableName}/schema`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dataRes.ok || !schemaRes.ok) {
        throw new Error('Failed to load table details');
      }

      const dataJson = await dataRes.json();
      const schemaJson = await schemaRes.json();

      setTableData(dataJson);
      setTableSchema(schemaJson.schema || []);
      setSelectedTable(tableName);
      setActiveView('table');
    } catch (err) {
      setError(err.message);
      console.error('Table details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const backupTable = async (tableName) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('qft-token');

      const res = await fetch(`${API_URL}/api/v1/database/tables/${tableName}/backup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to backup table');
      }

      const backup = await res.json();
      
      // Download as JSON file
      const dataStr = JSON.stringify(backup.backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableName}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`✅ Table "${tableName}" backed up successfully!\n${backup.backup.rowCount} rows exported.`);
    } catch (err) {
      alert(`❌ Backup failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const truncateTable = async (tableName) => {
    const confirmCode = `TRUNCATE_${tableName.toUpperCase()}`;
    
    if (confirmationInput !== confirmCode) {
      alert(`❌ Invalid confirmation code.\nPlease type: ${confirmCode}`);
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('qft-token');

      const res = await fetch(`${API_URL}/api/v1/database/tables/${tableName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode: confirmCode })
      });

      if (!res.ok) {
        throw new Error('Failed to truncate table');
      }

      alert(`✅ Table "${tableName}" truncated successfully!`);
      setShowTruncateConfirm(false);
      setConfirmationInput('');
      loadDatabaseInfo();
      setActiveView('overview');
      setSelectedTable(null);
    } catch (err) {
      alert(`❌ Truncate failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const purgeDatabase = async () => {
    const confirmCode = 'PURGE_DATABASE';
    
    if (confirmationInput !== confirmCode) {
      alert(`❌ Invalid confirmation code.\nPlease type: ${confirmCode}`);
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('qft-token');

      const res = await fetch(`${API_URL}/api/v1/database/purge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode: confirmCode })
      });

      if (!res.ok) {
        throw new Error('Failed to purge database');
      }

      const result = await res.json();
      alert(`✅ Database purged successfully!\n${result.tablesPurged} tables cleared.`);
      setShowPurgeConfirm(false);
      setConfirmationInput('');
      loadDatabaseInfo();
    } catch (err) {
      alert(`❌ Purge failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const executeQuery = async () => {
    try {
      setProcessing(true);
      setError(null);
      const token = localStorage.getItem('qft-token');

      const res = await fetch(`${API_URL}/api/v1/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: queryText })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const result = await res.json();
      setQueryResult(result);
    } catch (err) {
      setError(err.message);
      console.error('Query error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const deleteRow = async (row, primaryKey) => {
    if (!primaryKey) {
      alert('❌ Cannot delete: No primary key column found (id, uuid, or similar)');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this row?\n\n${primaryKey}: ${row[primaryKey]}`
    );
    
    if (!confirmDelete) return;

    try {
      setProcessing(true);
      const token = localStorage.getItem('qft-token');

      const res = await fetch(`${API_URL}/api/v1/database/tables/${selectedTable}/rows`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          primaryKeyColumn: primaryKey,
          primaryKeyValue: row[primaryKey]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      alert(`✅ Row deleted successfully!`);
      loadTableDetails(selectedTable); // Reload table data
    } catch (err) {
      alert(`❌ Delete failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const renderOverview = () => (
    <div className="db-overview">
      <div className="db-stats-grid">
        <div className="db-stat-card">
          <div className="db-stat-label">Database Name</div>
          <div className="db-stat-value">{stats?.databaseName || 'N/A'}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Database Size</div>
          <div className="db-stat-value">{stats?.size || 'N/A'}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Total Tables</div>
          <div className="db-stat-value">{stats?.tableCount || 0}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Total Rows</div>
          <div className="db-stat-value">{stats?.totalRows?.toLocaleString() || 0}</div>
        </div>
      </div>

      <div className="db-danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p>Destructive operations that cannot be undone without a backup.</p>
        <button 
          className="db-btn-danger"
          onClick={() => setShowPurgeConfirm(true)}
          disabled={processing}
        >
          🗑️ Purge Entire Database
        </button>
      </div>

      <div className="db-tables-section">
        <h3>Database Tables ({tables.length})</h3>
        <div className="db-tables-grid">
          {tables.map(table => (
            <div key={table.table_name} className="db-table-card">
              <div className="db-table-header">
                <h4>{table.table_name}</h4>
                <span className="db-table-count">{table.row_count?.toLocaleString() || 0} rows</span>
              </div>
              <div className="db-table-actions">
                <button 
                  className="db-btn-view"
                  onClick={() => loadTableDetails(table.table_name)}
                >
                  👁️ View Data
                </button>
                <button 
                  className="db-btn-backup"
                  onClick={() => backupTable(table.table_name)}
                  disabled={processing}
                >
                  💾 Backup
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTableView = () => {
    if (!tableData || !tableSchema) return null;

    return (
      <div className="db-table-view">
        <div className="db-table-header-bar">
          <button className="db-btn-back" onClick={() => {
            setActiveView('overview');
            setSelectedTable(null);
          }}>
            ← Back to Overview
          </button>
          <h2>{selectedTable}</h2>
          <div className="db-table-info">
            {tableData.total?.toLocaleString() || 0} total rows
          </div>
        </div>

        <div className="db-table-actions-bar">
          <button 
            className="db-btn-backup"
            onClick={() => backupTable(selectedTable)}
            disabled={processing}
          >
            💾 Backup Table
          </button>
          <button 
            className="db-btn-danger"
            onClick={() => setShowTruncateConfirm(true)}
            disabled={processing}
          >
            🗑️ Truncate Table
          </button>
        </div>

        <div className="db-schema-section">
          <h3>Schema</h3>
          <div className="db-schema-grid">
            {tableSchema.map((col, idx) => (
              <div key={idx} className="db-schema-item">
                <span className="db-col-name">{col.column_name}</span>
                <span className="db-col-type">{col.data_type}</span>
                {col.is_nullable === 'NO' && <span className="db-col-required">Required</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="db-data-section">
          <h3>Data (showing {tableData.data?.length || 0} of {tableData.total})</h3>
          <div className="db-data-table-wrapper">
            {tableData.data && tableData.data.length > 0 ? (
              <table className="db-data-table">
                <thead>
                  <tr>
                    {Object.keys(tableData.data[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                    <th className="db-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.data.map((row, idx) => {
                    // Find primary key (id, uuid, or first column)
                    const primaryKey = Object.keys(row).find(k => 
                      k === 'id' || k === 'uuid' || k === 'qft_uuid' || k.endsWith('_id')
                    ) || Object.keys(row)[0];
                    
                    return (
                      <tr key={idx}>
                        {Object.values(row).map((val, valIdx) => (
                          <td key={valIdx}>
                            {val === null ? <em className="db-null">null</em> : 
                             typeof val === 'object' ? JSON.stringify(val) : 
                             String(val)}
                          </td>
                        ))}
                        <td className="db-actions-cell">
                          <button
                            className="db-btn-delete-row"
                            onClick={() => deleteRow(row, primaryKey)}
                            disabled={processing}
                            title="Delete this row"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="db-empty-state">No data in this table</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQueryView = () => (
    <div className="db-query-view">
      <h2>SQL Query Console</h2>
      <p className="db-query-notice">⚠️ Only SELECT queries are allowed for safety</p>
      
      <textarea
        className="db-query-input"
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10;"
        rows={8}
      />
      
      <button 
        className="db-btn-execute"
        onClick={executeQuery}
        disabled={processing || !queryText.trim()}
      >
        ▶️ Execute Query
      </button>

      {queryResult && (
        <div className="db-query-result">
          <h3>Results ({queryResult.rowCount} rows)</h3>
          {queryResult.rows && queryResult.rows.length > 0 ? (
            <div className="db-data-table-wrapper">
              <table className="db-data-table">
                <thead>
                  <tr>
                    {queryResult.fields.map(field => (
                      <th key={field}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, valIdx) => (
                        <td key={valIdx}>
                          {val === null ? <em className="db-null">null</em> : 
                           typeof val === 'object' ? JSON.stringify(val) : 
                           String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="db-empty-state">Query returned no results</div>
          )}
        </div>
      )}
    </div>
  );

  if (loading && !tables.length) {
    return (
      <div className="database-manager-module">
        <div className="db-loading">Loading database information...</div>
      </div>
    );
  }

  return (
    <div className="database-manager-module">
      <div className="db-header">
        <h1>🗄️ Database Manager</h1>
        <div className="db-view-tabs">
          <button 
            className={`db-tab ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`db-tab ${activeView === 'query' ? 'active' : ''}`}
            onClick={() => setActiveView('query')}
          >
            💻 Query Console
          </button>
          <button 
            className="db-btn-refresh"
            onClick={loadDatabaseInfo}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="db-error">
          ❌ {error}
        </div>
      )}

      <div className="db-content">
        {activeView === 'overview' && renderOverview()}
        {activeView === 'table' && renderTableView()}
        {activeView === 'query' && renderQueryView()}
      </div>

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="db-modal-overlay" onClick={() => !processing && setShowPurgeConfirm(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirm Database Purge</h2>
            <p>This will <strong>DELETE ALL DATA</strong> from all tables in the database.</p>
            <p>This action <strong>CANNOT BE UNDONE</strong> without a backup!</p>
            <p>Type <code>PURGE_DATABASE</code> to confirm:</p>
            <input
              type="text"
              className="db-confirm-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="PURGE_DATABASE"
              disabled={processing}
            />
            <div className="db-modal-actions">
              <button 
                className="db-btn-cancel"
                onClick={() => {
                  setShowPurgeConfirm(false);
                  setConfirmationInput('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                className="db-btn-danger"
                onClick={purgeDatabase}
                disabled={processing || confirmationInput !== 'PURGE_DATABASE'}
              >
                {processing ? 'Purging...' : 'Purge Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Truncate Confirmation Modal */}
      {showTruncateConfirm && (
        <div className="db-modal-overlay" onClick={() => !processing && setShowTruncateConfirm(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirm Table Truncation</h2>
            <p>This will <strong>DELETE ALL ROWS</strong> from the table: <code>{selectedTable}</code></p>
            <p>This action <strong>CANNOT BE UNDONE</strong> without a backup!</p>
            <p>Type <code>TRUNCATE_{selectedTable?.toUpperCase()}</code> to confirm:</p>
            <input
              type="text"
              className="db-confirm-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`TRUNCATE_${selectedTable?.toUpperCase()}`}
              disabled={processing}
            />
            <div className="db-modal-actions">
              <button 
                className="db-btn-cancel"
                onClick={() => {
                  setShowTruncateConfirm(false);
                  setConfirmationInput('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                className="db-btn-danger"
                onClick={() => truncateTable(selectedTable)}
                disabled={processing || confirmationInput !== `TRUNCATE_${selectedTable?.toUpperCase()}`}
              >
                {processing ? 'Truncating...' : 'Truncate Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManagerModule;
