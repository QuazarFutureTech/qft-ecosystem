import React, { useState, useEffect } from 'react';
import { FaRobot, FaRocket, FaPlus, FaTrash, FaCog, FaPlay, FaPause, FaBan, FaEdit, FaSync, FaUsers, FaLink } from 'react-icons/fa';
import { handleDeployCommands, handleKickBot, getGuildIconUrl } from '../../services/user';
import { getWorkers, createWorker, updateWorkerState, deleteWorker, updateWorker } from '../../services/workers';
import { syncGuildAccounts, getSyncedAccounts, updateAccountRole, linkAccountToStaff } from '../../services/accountSync';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext';
import Modal from '../elements/Modal';
import WorkerForm from '../elements/WorkerForm';
import './BotControlModule.css';

function BotControlModule({ userGuilds = [], setUserGuilds, inviteUrl }) {
  const token = localStorage.getItem('qft-token');
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);
  
  // AI Workers state
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerFilter, setWorkerFilter] = useState('all'); // all, active, paused, retired
  
  // Account Sync state
  const [syncedAccounts, setSyncedAccounts] = useState([]);
  const [loadingSyncedAccounts, setLoadingSyncedAccounts] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Load workers when guild changes
  useEffect(() => {
    if (selectedGuildId && token) {
      loadWorkers();
      loadSyncedAccounts();
    }
  }, [selectedGuildId, token]);

  const loadWorkers = async () => {
    if (!selectedGuildId) return;
    setLoadingWorkers(true);
    try {
      const state = workerFilter !== 'all' ? workerFilter : null;
      const data = await getWorkers(selectedGuildId, token, state);
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Failed to load workers:', error);
      await confirmAction('Failed to load workers: ' + error.message, false, 'Error');
    } finally {
      setLoadingWorkers(false);
    }
  };

  const loadSyncedAccounts = async () => {
    if (!selectedGuildId) return;
    setLoadingSyncedAccounts(true);
    try {
      const data = await getSyncedAccounts(selectedGuildId, token);
      setSyncedAccounts(data.accounts || []);
      setLastSyncTime(data.lastSyncTime);
    } catch (error) {
      console.error('Failed to load synced accounts:', error);
    } finally {
      setLoadingSyncedAccounts(false);
    }
  };

  const handleSyncAccounts = async () => {
    if (!selectedGuildId) {
      await confirmAction('Please select a guild first', false, 'Error');
      return;
    }
    
    const confirmed = await confirmAction('Sync all Discord accounts from this server? This will add/update users in the QFT database so you can manage their permissions.', true, 'Sync Accounts');
    if (!confirmed) return;

    setSyncing(true);
    try {
      const result = await syncGuildAccounts(selectedGuildId, token);
      const message = result.newUsersCount > 0 
        ? `Successfully synced ${result.syncedCount} accounts (${result.newUsersCount} new users added to database)!`
        : `Successfully synced ${result.syncedCount} accounts!`;
      await confirmAction(message, false, 'Success');
      await loadSyncedAccounts();
      setLastSyncTime(result.lastSyncTime || new Date());
    } catch (error) {
      await confirmAction('Failed to sync accounts: ' + error.message, false, 'Error');
    } finally {
      setSyncing(false);
    }
  };

  const handleWorkerStateChange = async (workerId, newState) => {
    try {
      await updateWorkerState(workerId, newState, token);
      await loadWorkers();
      await confirmAction(`Worker ${newState} successfully!`, false, 'Success');
    } catch (error) {
      await confirmAction('Failed to update worker state: ' + error.message, false, 'Error');
    }
  };

  const handleDeleteWorker = async (workerId, workerName) => {
    const confirmed = await confirmAction(`Delete worker "${workerName}"? This cannot be undone.`, true, 'Delete Worker');
    if (!confirmed) return;

    try {
      await deleteWorker(workerId, token);
      await loadWorkers();
      await confirmAction('Worker deleted successfully!', false, 'Success');
    } catch (error) {
      await confirmAction('Failed to delete worker: ' + error.message, false, 'Error');
    }
  };

  const handleCreateWorker = async (workerData) => {
    try {
      await createWorker(selectedGuildId, workerData, token);
      setShowWorkerForm(false);
      await loadWorkers();
      await confirmAction('Worker created successfully!', false, 'Success');
    } catch (error) {
      await confirmAction('Failed to create worker: ' + error.message, false, 'Error');
    }
  };

  const handleUpdateWorker = async (workerId, updates) => {
    try {
      await updateWorker(workerId, updates, token);
      setEditingWorker(null);
      await loadWorkers();
      await confirmAction('Worker updated successfully!', false, 'Success');
    } catch (error) {
      await confirmAction('Failed to update worker: ' + error.message, false, 'Error');
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'active': return 'var(--success-color)';
      case 'paused': return 'var(--warning-color)';
      case 'retired': return 'var(--text-tertiary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'active': return <FaPlay />;
      case 'paused': return <FaPause />;
      case 'retired': return <FaBan />;
      default: return <FaCog />;
    }
  };

  const confirmAction = (message, isConfirm = true, title = "Confirmation") => {
    return new Promise((resolve) => {
      setModalTitle(title);
      setModalMessage(message);
      setIsModalOpen(true);
      setModalConfirmAction(() => (confirmed) => {
        setIsModalOpen(false);
        resolve(confirmed);
      });
    });
  };

  const onConfirmKickBot = async (guildId, guildName) => {
    const isConfirmed = await confirmAction(`Are you SURE you want to kick the QFT Agent from ${guildName}?`);
    if (!isConfirmed) return;

    const result = await handleKickBot(guildId, guildName, token, setUserGuilds);
    if (result.success) {
      await confirmAction(result.message, false, "Success");
    } else {
      await confirmAction(result.message, false, "Error");
    }
  };

  const onConfirmDeployCommands = async () => {
    const isConfirmed = await confirmAction("Deploy all slash commands globally? This may take time.");
    if (!isConfirmed) return;

    const result = await handleDeployCommands(token);
    if (result.success) {
      await confirmAction(result.message, false, "Success");
    } else {
      await confirmAction(result.message, false, "Error");
    }
  };

  return (
    <div className="bot-control-container">
      {/* Bot Management Section */}
      <div className="qft-card">
        <h2><FaRobot /> Bot Management</h2>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="qft-button" onClick={onConfirmDeployCommands}>
            <FaRocket /> Deploy Commands
          </button>
          {inviteUrl && (
            <a className="qft-button" href={inviteUrl} target="_blank" rel="noreferrer">
              <FaPlus /> Add QFT Agent to Server
            </a>
          )}
        </div>

        <h3 style={{ marginTop: '20px' }}>Connected Servers</h3>
        <ul className="guild-list">
          {userGuilds.map(g => (
            <li key={g.id} className="guild-entry" style={{ borderLeftColor: 'var(--accent-primary)' }}>
              <div className="guild-info-area">
                {getGuildIconUrl(g) ? (
                  <img
                    src={getGuildIconUrl(g)}
                    alt={`${g.name}'s icon`}
                    className="guild-icon"
                    style={{ borderColor: 'var(--accent-secondary)' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="guild-icon"
                  style={{
                    borderColor: 'var(--accent-secondary)',
                    display: getGuildIconUrl(g) ? 'none' : 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {g.name.charAt(0)}
                </div>
                <span>{g.name}</span>
              </div>
              <button className="qft-button danger" onClick={() => onConfirmKickBot(g.id, g.name)}>
                <FaTrash /> Kick Bot
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Workers Section */}
      <div className="qft-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2><FaCog /> AI Workers</h2>
          <button className="qft-button primary" onClick={() => setShowWorkerForm(true)} disabled={!selectedGuildId}>
            <FaPlus /> Create Worker
          </button>
        </div>

        {!selectedGuildId && (
          <p className="info-text">Please select a guild to manage AI workers</p>
        )}

        {selectedGuildId && (
          <>
            <div className="filter-buttons" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <button 
                className={`qft-button ${workerFilter === 'all' ? 'primary' : 'secondary'}`}
                onClick={() => { setWorkerFilter('all'); loadWorkers(); }}
              >
                All
              </button>
              <button 
                className={`qft-button ${workerFilter === 'active' ? 'success' : 'secondary'}`}
                onClick={() => { setWorkerFilter('active'); loadWorkers(); }}
              >
                Active
              </button>
              <button 
                className={`qft-button ${workerFilter === 'paused' ? 'warning' : 'secondary'}`}
                onClick={() => { setWorkerFilter('paused'); loadWorkers(); }}
              >
                Paused
              </button>
              <button 
                className={`qft-button ${workerFilter === 'retired' ? 'secondary' : 'secondary'}`}
                onClick={() => { setWorkerFilter('retired'); loadWorkers(); }}
              >
                Retired
              </button>
            </div>

            {loadingWorkers ? (
              <p>Loading workers...</p>
            ) : workers.length === 0 ? (
              <p className="info-text">No workers found. Create one to get started!</p>
            ) : (
              <div className="workers-table">
                <table className="qft-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Trigger</th>
                      <th>Platform</th>
                      <th>Executions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(worker => (
                      <tr key={worker.id}>
                        <td>
                          <span className="worker-status" style={{ color: getStateColor(worker.lifecycle_state) }}>
                            {getStateIcon(worker.lifecycle_state)} {worker.lifecycle_state}
                          </span>
                        </td>
                        <td>
                          <strong>{worker.worker_name}</strong>
                          <div className="worker-description">{worker.description}</div>
                        </td>
                        <td>{worker.trigger?.type || 'N/A'}</td>
                        <td>{worker.platforms?.join(', ') || 'discord'}</td>
                        <td>{worker.execution_count || 0}</td>
                        <td>
                          <div className="worker-actions" style={{ display: 'flex', gap: '5px' }}>
                            {worker.lifecycle_state !== 'active' && (
                              <button 
                                className="qft-button success small"
                                onClick={() => handleWorkerStateChange(worker.id, 'active')}
                                title="Activate"
                              >
                                <FaPlay />
                              </button>
                            )}
                            {worker.lifecycle_state === 'active' && (
                              <button 
                                className="qft-button warning small"
                                onClick={() => handleWorkerStateChange(worker.id, 'paused')}
                                title="Pause"
                              >
                                <FaPause />
                              </button>
                            )}
                            <button 
                              className="qft-button secondary small"
                              onClick={() => setEditingWorker(worker)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="qft-button secondary small"
                              onClick={() => handleWorkerStateChange(worker.id, 'retired')}
                              title="Retire"
                            >
                              <FaBan />
                            </button>
                            <button 
                              className="qft-button danger small"
                              onClick={() => handleDeleteWorker(worker.id, worker.worker_name)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Account Sync Section */}
      <div className="qft-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2><FaUsers /> Account Sync</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              className="qft-select"
              value={selectedGuildId || ''}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              disabled={syncing}
              style={{ minWidth: '200px' }}
            >
              <option value="">Select a server...</option>
              {userGuilds.map(guild => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
            <button 
              className="qft-button primary" 
              onClick={handleSyncAccounts} 
              disabled={!selectedGuildId || syncing}
            >
              <FaSync className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing...' : 'Sync Accounts'}
            </button>
          </div>
        </div>

        {!selectedGuildId && (
          <p className="info-text">Please select a server to sync accounts from Discord</p>
        )}

        {selectedGuildId && (
          <>
            {lastSyncTime && (
              <p className="info-text" style={{ marginBottom: '15px' }}>
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </p>
            )}

            {loadingSyncedAccounts ? (
              <p>Loading synced accounts...</p>
            ) : syncedAccounts.length === 0 ? (
              <p className="info-text">No synced accounts yet. Click "Sync Accounts" to import from Discord.</p>
            ) : (
              <div className="synced-accounts-table">
                <table className="qft-table">
                  <thead>
                    <tr>
                      <th>Discord Username</th>
                      <th>User ID</th>
                      <th>Discord Roles</th>
                      <th>Website Role</th>
                      <th>Linked Staff</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncedAccounts.map(account => (
                      <tr key={account.id}>
                        <td>{account.username}</td>
                        <td><code>{account.discord_user_id}</code></td>
                        <td>
                          <div className="roles-list">
                            {account.discord_roles?.slice(0, 3).map((role, i) => (
                              <span key={i} className="role-badge">{role}</span>
                            ))}
                            {account.discord_roles?.length > 3 && (
                              <span className="role-badge">+{account.discord_roles.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${account.website_role}`}>
                            {account.website_role || 'user'}
                          </span>
                        </td>
                        <td>
                          {account.staff_profile_id ? (
                            <span className="linked-badge"><FaLink /> Linked</span>
                          ) : (
                            <span className="text-muted">Not linked</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="qft-button secondary small"
                            onClick={() => {/* TODO: Open role/link editor */}}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}

      {/* Worker Creation/Edit Form */}
      {(showWorkerForm || editingWorker) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowWorkerForm(false);
            setEditingWorker(null);
          }}
          title={editingWorker ? 'Edit Worker' : 'Create AI Worker'}
        >
          <WorkerForm
            worker={editingWorker}
            onSubmit={editingWorker ? 
              (updates) => handleUpdateWorker(editingWorker.id, updates) : 
              handleCreateWorker
            }
            onCancel={() => {
              setShowWorkerForm(false);
              setEditingWorker(null);
            }}
          />
        </Modal>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => modalConfirmAction(false)} // Pass false if modal is closed without action
        title={modalTitle}
      >
        <p>{modalMessage}</p>
        {modalTitle === "Confirmation" && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => modalConfirmAction(false)} className="qft-button" style={{ marginRight: '10px', backgroundColor: 'var(--accent-secondary)', color: 'white' }}>
              Cancel
            </button>
            <button onClick={() => modalConfirmAction(true)} className="qft-button" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
              Confirm
            </button>
          </div>
        )}
         {modalTitle !== "Confirmation" && ( // For alerts (Success/Error messages)
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => modalConfirmAction(true)} className="qft-button" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
              OK
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BotControlModule;