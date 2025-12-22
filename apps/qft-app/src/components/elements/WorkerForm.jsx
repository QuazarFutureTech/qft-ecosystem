// WorkerForm.jsx - Form component for creating/editing AI Workers
import React, { useState, useEffect } from 'react';
import Switch from './Switch';
import { FaSave, FaTimes } from 'react-icons/fa';

const TRIGGER_TYPES = [
  { value: 'message_create', label: 'Message Created' },
  { value: 'message_edit', label: 'Message Edited' },
  { value: 'member_join', label: 'Member Joined' },
  { value: 'member_leave', label: 'Member Left' },
  { value: 'ticket_create', label: 'Ticket Created' },
  { value: 'command_execute', label: 'Command Executed' },
  { value: 'schedule', label: 'Schedule (Cron)' }
];

const ACTION_TYPES = [
  { value: 'send_message', label: 'Send Message' },
  { value: 'add_role', label: 'Add Role' },
  { value: 'remove_role', label: 'Remove Role' },
  { value: 'dm_user', label: 'Send DM' },
  { value: 'log_event', label: 'Log Event' },
  { value: 'notify_staff', label: 'Notify Staff' }
];

const PLATFORMS = [
  { value: 'discord', label: 'Discord' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter/X' }
];

function WorkerForm({ worker, onSubmit, onCancel }) {
  const [workerName, setWorkerName] = useState(worker?.worker_name || '');
  const [description, setDescription] = useState(worker?.description || '');
  const [triggerType, setTriggerType] = useState(worker?.trigger?.type || 'message_create');
  const [triggerParams, setTriggerParams] = useState(worker?.trigger?.params || {});
  const [actions, setActions] = useState(worker?.actions || [{ type: 'send_message', params: {} }]);
  const [platforms, setPlatforms] = useState(worker?.platforms || ['discord']);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!workerName.trim()) {
      newErrors.workerName = 'Worker name is required';
    }
    
    if (actions.length === 0) {
      newErrors.actions = 'At least one action is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const workerData = {
      workerName,
      description,
      trigger: {
        type: triggerType,
        params: triggerParams
      },
      actions,
      platforms
    };
    
    onSubmit(workerData);
  };

  const addAction = () => {
    setActions([...actions, { type: 'send_message', params: {} }]);
  };

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index, field, value) => {
    const newActions = [...actions];
    if (field === 'type') {
      newActions[index].type = value;
      newActions[index].params = {}; // Reset params when type changes
    } else {
      newActions[index].params[field] = value;
    }
    setActions(newActions);
  };

  const togglePlatform = (platform) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="worker-form">
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="form-field">
          <label>Worker Name *</label>
          <input
            type="text"
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder="e.g., Welcome New Members"
            className={errors.workerName ? 'error' : ''}
          />
          {errors.workerName && <span className="error-text">{errors.workerName}</span>}
        </div>

        <div className="form-field">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this worker does..."
            rows={3}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Trigger</h3>
        
        <div className="form-field">
          <label>Trigger Type *</label>
          <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
            {TRIGGER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {triggerType === 'schedule' && (
          <div className="form-field">
            <label>Cron Expression</label>
            <input
              type="text"
              value={triggerParams.cron || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, cron: e.target.value })}
              placeholder="e.g., 0 0 * * * (every day at midnight)"
            />
            <small className="help-text">
              Format: minute hour day month weekday
            </small>
          </div>
        )}

        {triggerType === 'message_create' && (
          <div className="form-field">
            <label>Filter Pattern (optional)</label>
            <input
              type="text"
              value={triggerParams.pattern || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, pattern: e.target.value })}
              placeholder="e.g., hello|hi|hey"
            />
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Actions</h3>
        
        {actions.map((action, index) => (
          <div key={index} className="action-item">
            <div className="action-header">
              <label>Action {index + 1}</label>
              {actions.length > 1 && (
                <button
                  type="button"
                  className="qft-button danger small"
                  onClick={() => removeAction(index)}
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="form-field">
              <select
                value={action.type}
                onChange={(e) => updateAction(index, 'type', e.target.value)}
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {(action.type === 'send_message' || action.type === 'dm_user' || action.type === 'notify_staff') && (
              <div className="form-field">
                <label>Message</label>
                <textarea
                  value={action.params.message || ''}
                  onChange={(e) => updateAction(index, 'message', e.target.value)}
                  placeholder="Enter message content..."
                  rows={2}
                />
              </div>
            )}

            {(action.type === 'add_role' || action.type === 'remove_role') && (
              <div className="form-field">
                <label>Role ID</label>
                <input
                  type="text"
                  value={action.params.roleId || ''}
                  onChange={(e) => updateAction(index, 'roleId', e.target.value)}
                  placeholder="Discord role ID"
                />
              </div>
            )}
          </div>
        ))}

        {errors.actions && <span className="error-text">{errors.actions}</span>}

        <button type="button" className="qft-button secondary" onClick={addAction}>
          + Add Action
        </button>
      </div>

      <div className="form-section">
        <h3>Platforms</h3>
        <div className="platform-switches">
          {PLATFORMS.map(p => (
            <Switch
              key={p.value}
              label={p.label}
              checked={platforms.includes(p.value)}
              onChange={() => togglePlatform(p.value)}
            />
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="qft-button secondary" onClick={onCancel}>
          <FaTimes /> Cancel
        </button>
        <button type="submit" className="qft-button primary">
          <FaSave /> {worker ? 'Update' : 'Create'} Worker
        </button>
      </div>
    </form>
  );
}

export default WorkerForm;
