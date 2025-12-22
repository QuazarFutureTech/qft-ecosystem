import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal.jsx';
import ConfirmModal from '../elements/ConfirmModal';
import '../modules.css';

export default function WorkerBuilder() {
  const { qftRole } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [formData, setFormData] = useState({
    workerName: '',
    description: '',
    trigger: { type: 'message', keyword: '' },
    actions: [{ type: 'send_message', params: { message: '' } }],
    platforms: ['discord'],
    assignedRoleId: null,
  });
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const token = localStorage.getItem('qft-token');
  const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

  useEffect(() => {
    if (selectedGuildId) {
      fetchWorkers();
      fetchRoles();
    }
  }, [selectedGuildId]);

  const fetchWorkers = async () => {
    if (!selectedGuildId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/workers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      showAlert('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/permissions/roles`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreateWorker = async () => {
    if (!selectedGuildId) return;
    if (!formData.workerName) {
      showAlert('Please enter a worker name');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/${selectedGuildId}/workers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Worker created!');
        setFormData({
          workerName: '',
          description: '',
          trigger: { type: 'message', keyword: '' },
          actions: [{ type: 'send_message', params: { message: '' } }],
          platforms: ['discord'],
        });
        setShowCreate(false);
        fetchWorkers();
      }
    } catch (error) {
      showAlert('Error creating worker');
    }
  };

  const handleDeleteWorker = async (workerId) => {
    const confirmed = await showConfirm('Delete this worker?');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/workers/${workerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        showAlert('Worker deleted');
        fetchWorkers();
      }
    } catch (error) {
      showAlert('Error deleting worker');
    }
  };

  const triggerTypes = ['message', 'user_join', 'reaction', 'schedule'];
  const actionTypes = ['send_message', 'assign_role', 'send_dm', 'log_event', 'api_call', 'notify_reddit', 'post_twitter'];

  return (
    <div className="worker-builder">
      <h2>Workflow Builder</h2>

      <div className="worker-controls">
        <button className="btn primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Worker'}
        </button>
      </div>

      {showCreate && (
        <div className="create-worker-form">
          <div className="form-group">
            <label>Worker Name</label>
            <input
              type="text"
              value={formData.workerName}
              onChange={(e) => setFormData({ ...formData, workerName: e.target.value })}
              aria-label="Worker name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              aria-label="Worker description"
            />
          </div>

          <div className="form-group">
            <label>Assign to Role (Optional)</label>
            <select
              value={formData.assignedRoleId || ''}
              onChange={(e) => setFormData({ ...formData, assignedRoleId: e.target.value || null })}
              aria-label="Assigned role"
            >
              <option value="">No role restriction (anyone can execute)</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} - Clearance {role.clearance_level}
                </option>
              ))}
            </select>
            <small>Only users with this role can manually execute this worker</small>
          </div>

          <div className="form-section">
            <h3>Trigger</h3>
            <select
              value={formData.trigger.type}
              onChange={(e) => setFormData({ ...formData, trigger: { ...formData.trigger, type: e.target.value } })}
              aria-label="Trigger type"
            >
              {triggerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {formData.trigger.type === 'message' && (
              <input
                type="text"
                placeholder="Keyword to match"
                value={formData.trigger.keyword}
                onChange={(e) => setFormData({ ...formData, trigger: { ...formData.trigger, keyword: e.target.value } })}
                aria-label="Message keyword trigger"
              />
            )}
          </div>

          <div className="form-section">
            <h3>Actions</h3>
            {formData.actions.map((action, idx) => (
              <div key={idx} className="action-block">
                <select
                  value={action.type}
                  onChange={(e) => {
                    const newActions = [...formData.actions];
                    newActions[idx].type = e.target.value;
                    setFormData({ ...formData, actions: newActions });
                  }}
                  aria-label={`Action ${idx + 1} type`}
                >
                  {actionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                {action.type === 'send_message' && (
                  <input
                    type="text"
                    placeholder="Message content"
                    value={action.params.message}
                    onChange={(e) => {
                      const newActions = [...formData.actions];
                      newActions[idx].params.message = e.target.value;
                      setFormData({ ...formData, actions: newActions });
                    }}
                    aria-label={`Action ${idx + 1} message`}
                  />
                )}

                {formData.actions.length > 1 && (
                  <button
                    className="btn danger small"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        actions: formData.actions.filter((_, i) => i !== idx),
                      });
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              className="btn secondary"
              onClick={() =>
                setFormData({
                  ...formData,
                  actions: [...formData.actions, { type: 'send_message', params: { message: '' } }],
                })
              }
            >
              Add Action
            </button>
          </div>

          <button className="btn primary" onClick={handleCreateWorker}>
            Create Worker
          </button>
        </div>
      )}

      <div className="workers-list">
        {loading ? (
          <p>Loading workers...</p>
        ) : workers.length === 0 ? (
          <p>No workers created yet</p>
        ) : (
          workers.map((worker) => (
            <div key={worker.id} className="worker-card">
              <div className="worker-header">
                <h3>{worker.worker_name}</h3>
                <span className={`state state-${worker.lifecycle_state}`}>{worker.lifecycle_state}</span>
              </div>
              <p>{worker.description}</p>
              <div className="worker-meta">
                <span>Trigger: {JSON.parse(worker.trigger).type}</span>
                <span>Actions: {JSON.parse(worker.actions).length}</span>
                <span>Executions: {worker.execution_count}</span>
              </div>
              <div className="worker-actions">
                <button className="btn secondary" onClick={() => setSelectedWorker(worker)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => handleDeleteWorker(worker.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
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
