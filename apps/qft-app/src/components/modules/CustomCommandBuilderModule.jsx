import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
import TemplateEditor from '../TemplateEditor';
import { listCommands, createCommand, updateCommand, deleteCommand, refreshCustomCommands } from '../../services/customCommands';
import { useUser } from '../../contexts/UserContext';
import { ChannelSelector, RoleSelector } from '../elements/GuildDropdowns';
import Input from '../elements/Input';
import EmojiSelector from '../elements/EmojiSelector';
import { FaPlus, FaTrash, FaEdit, FaCog, FaCode, FaBook, FaSave, FaTimes, FaSyncAlt } from 'react-icons/fa';
import '../modules.css';
import './CustomCommandBuilderModule.css';

export default function CustomCommandsModule() {
  const { selectedGuildId } = useSelectedGuild();
  const { userStatus } = useUser ? useUser() : {};
  const token = localStorage.getItem('qft-token');
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('trigger');
  // Removed showAdvanced and showHelp toggles
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const triggerTypeFields = {
    command: ['trigger', 'caseSensitive', 'triggerOnEdit'],
    contains: ['trigger', 'caseSensitive', 'triggerOnEdit'],
    regex: ['trigger', 'caseSensitive', 'triggerOnEdit'],
    slash: ['trigger', 'description', 'responseType', 'ephemeral'],
    button: ['customId'],
    modal: ['customId'],
    select_menu: ['customId'],
    reaction: ['reactionEventType', 'emoji'],
    scheduled: ['scheduleTime', 'recurrence', 'timezone'],
    role_add: ['roleId'],
    role_remove: ['roleId'],
    role_update: ['roleId'],
    voice_join: ['voiceChannel'],
    voice_leave: ['voiceChannel'],
  };

  const initialFormState = {
    commandName: '',
    trigger: '',
    description: '',
    triggerType: 'command',
    commandCode: '{{ sendMessage "Hello!" }}',
    responseType: 'text',
    caseSensitive: false,
    triggerOnEdit: false,
    isEphemeral: false,
    responseInDM: false,
    deleteTrigger: false,
    deleteResponse: 0,
    cooldownSeconds: 0,
    customId: '',
    emoji: '',
    reactionEventType: 'both',
    scheduleTime: '',
    recurrence: '',
    timezone: 'UTC',
    requireRoles: [],
    ignoreRoles: [],
    requireChannels: [],
    ignoreChannels: [],
    enabled: true
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!token) return;
    if (selectedGuildId) {
      loadCommands();
    }
  }, [selectedGuildId, token]);

  const loadCommands = async () => {
    console.log('[CustomCommands] Loading commands for guild:', selectedGuildId);
    setLoading(true);
    try {
      if (!token) {
        console.log('[CustomCommands] No token available');
        return;
      }
      const data = await listCommands(selectedGuildId, token);
      console.log('[CustomCommands] Loaded commands:', data);
      setCommands((data && data.commands) || []);
    } catch (error) {
      console.error("[CustomCommands] Failed to load commands", error);
      showAlert('Error', 'Failed to load commands.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showField = (fieldName) => {
    const allowed = triggerTypeFields[formData.triggerType] || [];
    return allowed.includes(fieldName);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingCommandIndex(null);
    setEditing(false);
    setActiveTab('basic');
  };

  const handleEdit = (cmd) => {
    setFormData({
      commandName: cmd.command_name || cmd.name,
      trigger: cmd.trigger_data?.trigger || '',
      description: cmd.description || '',
      triggerType: cmd.trigger_type,
      commandCode: cmd.command_code || cmd.response || '',
      responseType: cmd.response_type || 'text',
      caseSensitive: cmd.case_sensitive || false,
      triggerOnEdit: cmd.trigger_on_edit || false,
      isEphemeral: cmd.is_ephemeral || false,
      responseInDM: cmd.response_in_dm || false,
      deleteTrigger: cmd.delete_trigger || false,
      deleteResponse: cmd.delete_response || 0,
      cooldownSeconds: cmd.cooldown_seconds || 0,
      customId: cmd.trigger_data?.customId || '',
      emoji: cmd.trigger_data?.emoji || '',
      reactionEventType: cmd.trigger_data?.reactionEventType || 'both',
      scheduleTime: cmd.trigger_data?.scheduleTime || '',
      recurrence: cmd.trigger_data?.recurrence || '',
      timezone: cmd.trigger_data?.timezone || 'UTC',
      requireRoles: cmd.require_roles || [],
      ignoreRoles: cmd.ignore_roles || [],
      requireChannels: cmd.require_channels || [],
      ignoreChannels: cmd.ignore_channels || [],
      enabled: cmd.enabled !== false
    });
    setEditingCommandIndex(cmd.command_index ?? cmd.id);
    setEditing(true);
  };

  const handleDelete = (commandIndex) => {
    showConfirm('Delete Command', 'Are you sure you want to delete this command?', async () => {
      try {
        if (!token) return;
        await deleteCommand(selectedGuildId, commandIndex, token);
        loadCommands();
        closeModal();
      } catch (error) {
        showAlert('Error', 'Failed to delete command.');
      }
    });
  };

  const handleSave = async () => {
    console.log('[CustomCommands] Saving command...', { selectedGuildId, formData });
    
    // Validate trigger field for trigger types that require it (this is the primary requirement)
    if (showField('trigger') && !formData.trigger) {
      showAlert('Validation Error', 'Trigger is required for this trigger type.');
      return;
    }
    
    // For other trigger types, validate their specific required fields
    if (formData.triggerType === 'button' || formData.triggerType === 'modal' || formData.triggerType === 'select_menu') {
      if (!formData.customId) {
        showAlert('Validation Error', 'Custom ID is required for this trigger type.');
        return;
      }
    }
    if (!token) {
      showAlert('Authentication Error', 'You must be logged in to save commands.');
      return;
    }
    
    if (!selectedGuildId) {
      showAlert('Error', 'No guild selected. Please select a guild from the dropdown.');
      return;
    }

    const payload = {
      command_name: formData.commandName,
      description: formData.description,
      trigger_type: formData.triggerType,
      command_code: formData.commandCode,
      response_type: formData.responseType,
      case_sensitive: formData.caseSensitive,
      trigger_on_edit: formData.triggerOnEdit,
      is_ephemeral: formData.isEphemeral,
      response_in_dm: formData.responseInDM,
      delete_trigger: formData.deleteTrigger,
      delete_response: parseInt(formData.deleteResponse),
      cooldown_seconds: parseInt(formData.cooldownSeconds),
      require_roles: formData.requireRoles,
      ignore_roles: formData.ignoreRoles,
      require_channels: formData.requireChannels,
      ignore_channels: formData.ignoreChannels,
      enabled: formData.enabled,
      trigger_data: {
        trigger: formData.trigger,
        customId: formData.customId,
        emoji: formData.emoji,
        reactionEventType: formData.reactionEventType,
        scheduleTime: formData.scheduleTime,
        recurrence: formData.recurrence,
        timezone: formData.timezone
      }
    };

    console.log('[CustomCommands] Payload:', payload);

    try {
      let result;
      if (editingCommandIndex !== null && editingCommandIndex !== undefined) {
        result = await updateCommand(selectedGuildId, editingCommandIndex, payload, token);
        console.log('[CustomCommands] Update result:', result);
        showAlert('Success', 'Command updated successfully!');
      } else {
        result = await createCommand(selectedGuildId, payload, token);
        console.log('[CustomCommands] Create result:', result);
        showAlert('Success', 'Command created successfully!');
      }
      resetForm();
      await loadCommands();
    } catch (error) {
      console.error('[CustomCommands] Save error:', error);
      showAlert('Error', 'Failed to save command.');
    }
  };

  const handleRefreshSlash = async () => {
    try {
      if (!token) return;
      await refreshCustomCommands(selectedGuildId, token);
      showAlert('Success', 'Slash commands refreshed in Discord.');
    } catch (error) {
      showAlert('Error', 'Failed to refresh slash commands.');
    }
  };

  const insertTemplate = (type) => {
    let text = '';
    switch (type) {
      case 'welcome': text = '{{ sendMessage "Welcome " .User.Username "!" }}'; break;
      case 'userinfo': text = 'User ID: {{ .User.ID }}\nJoined: {{ .Member.JoinedAt }}'; break;
      case 'random': text = 'You rolled: {{ randInt 1 100 }}'; break;
      case 'embed': text = '{{ cembed "Title" "Description" "#FF0000" }}'; break;
      case 'conditional': text = '{{ if .Args }}\n  You said: {{ index .Args 0 }}\n{{ else }}\n  No args provided.\n{{ end }}'; break;
      case 'args': text = 'Arg 1: {{ index .Args 0 }}'; break;
      default: break;
    }
    setFormData(prev => ({ ...prev, commandCode: prev.commandCode + '\n' + text }));
  };

  function rendertriggerTab() {
    return (
      <div className="tab-panel">
        <div className="qft-field">
          <label className="qft-label">Command Name (Optional)</label>
          <input
            type="text"
            className="qft-input"
            value={formData.commandName}
            onChange={e => handleInputChange('commandName', e.target.value)}
            placeholder="My Welcome Command"
          />
          <small>Display name for this command (shown in dashboard). If left blank, the trigger will be used as the name.</small>
        </div>
        
        <div className="qft-field">
          <label className="qft-label">Description</label>
          <input
            type="text"
            className="qft-input"
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            placeholder="Welcomes new users"
          />
        </div>
        
        <div className="qft-field">
          <label className="qft-label">Trigger Type</label>
          <select
            className="qft-select"
            value={formData.triggerType}
            onChange={e => handleInputChange('triggerType', e.target.value)}
          >
            <optgroup label="Message Triggers">
              <option value="command">Command (Starts with prefix)</option>
              <option value="contains">Contains (Anywhere in message)</option>
              <option value="regex">Regex (Pattern matching)</option>
            </optgroup>
            <optgroup label="Slash Commands">
              <option value="slash">Slash Command (/command)</option>
            </optgroup>
            <optgroup label="Component Listeners">
              <option value="button">Button Click</option>
              <option value="modal">Modal Submit</option>
            </optgroup>
            <optgroup label="Reaction Events">
              <option value="reaction">Message Reaction</option>
            </optgroup>
            <optgroup label="Scheduled">
              <option value="scheduled">Scheduled/Timer</option>
            </optgroup>
          </select>
        </div>

        {/* Dynamic trigger field based on trigger type */}
        {showField('trigger') && (
          <div className="qft-field">
            <label className="qft-label">
              {formData.triggerType === 'command' && 'Command Trigger'}
              {formData.triggerType === 'contains' && 'Contains Text'}
              {formData.triggerType === 'regex' && 'Regex Pattern'}
              {formData.triggerType === 'slash' && 'Slash Command Name'}
              {' '}<span style={{color: 'red'}}>*</span>
            </label>
            <input
              type="text"
              className="qft-input"
              value={formData.trigger}
              onChange={e => handleInputChange('trigger', e.target.value)}
              placeholder={
                formData.triggerType === 'command' ? 'welcome' :
                formData.triggerType === 'contains' ? 'hello' :
                formData.triggerType === 'regex' ? '^hello.*world$' :
                formData.triggerType === 'slash' ? 'welcome' :
                'trigger'
              }
            />
            <small>
              {formData.triggerType === 'command' && 'The word/phrase after the prefix (e.g., "welcome" for !welcome)'}
              {formData.triggerType === 'contains' && 'Text that can appear anywhere in the message'}
              {formData.triggerType === 'regex' && 'JavaScript regular expression pattern'}
              {formData.triggerType === 'slash' && 'The name of the slash command (e.g., "welcome" for /welcome)'}
            </small>
          </div>
        )}

        {showField('caseSensitive') && (
          <div className="qft-field">
            <Switch
              label="Case Sensitive"
              checked={formData.caseSensitive}
              onChange={e => handleInputChange('caseSensitive', e.target.checked)}
            />
          </div>
        )}
        {showField('triggerOnEdit') && (
          <div className="qft-field">
            <Switch
              label="Trigger on Edit"
              checked={formData.triggerOnEdit}
              onChange={e => handleInputChange('triggerOnEdit', e.target.checked)}
            />
          </div>
        )}
        
        {/* Reaction-specific fields */}
        {showField('reactionEventType') && (
          <div className="qft-field">
            <label className="qft-label">Reaction Event Type</label>
            <select
              className="qft-select"
              value={formData.reactionEventType}
              onChange={e => handleInputChange('reactionEventType', e.target.value)}
            >
              <option value="added">Reaction Added</option>
              <option value="removed">Reaction Removed</option>
              <option value="both">Both (Added & Removed)</option>
            </select>
            <small>When should this command trigger?</small>
          </div>
        )}
        {showField('emoji') && (
          <div className="qft-field">
            <label className="qft-label">Emoji</label>
            <EmojiSelector
              guildId={selectedGuildId}
              value={formData.emoji || ''}
              onChange={val => handleInputChange('emoji', val)}
            />
            <small>Leave blank to match any emoji</small>
          </div>
        )}
        
        {/* Component listener fields */}
        {showField('customId') && (
          <div className="qft-field">
            <label className="qft-label">Custom ID</label>
            <Input
              value={formData.customId || ''}
              onChange={e => handleInputChange('customId', e.target.value)}
              placeholder="e.g. ticket_create_btn"
            />
            <small>The custom_id of the button/modal/select menu to listen for</small>
          </div>
        )}
        
        {/* Scheduled fields */}
        {showField('scheduleTime') && (
          <div className="qft-field">
            <label className="qft-label">Schedule/Cron</label>
            <Input
              value={formData.scheduleTime || ''}
              onChange={e => handleInputChange('scheduleTime', e.target.value)}
              placeholder="CRON expression (e.g. * * * * *)"
            />
            <small>CRON expression for when to run this command</small>
          </div>
        )}

        <div className="qft-field">
          <label className="qft-label">Cooldown (seconds)</label>
          <input
            type="number"
            className="qft-input"
            value={formData.cooldownSeconds}
            onChange={e => handleInputChange('cooldownSeconds', parseInt(e.target.value) || 0)}
            min="0"
          />
          <small>Minimum time between command uses (0 = no cooldown)</small>
        </div>
      </div>
    );
  }

  function renderResponseTab() {
    return (
      <div className="tab-panel">
        <div className="qft-field">
          <label className="qft-label">Response Type</label>
          <select
            className="qft-select"
            value={formData.responseType}
            onChange={e => handleInputChange('responseType', e.target.value)}
          >
            <option value="text">Text</option>
            <option value="embed">Embed</option>
            <option value="dm">Direct Message</option>
          </select>
        </div>

        <div className="qft-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div className="qft-field">
            <Switch
              label="Ephemeral (Hidden)"
              checked={formData.isEphemeral}
              onChange={e => handleInputChange('isEphemeral', e.target.checked)}
            />
          </div>
          <div className="qft-field">
            <Switch
              label="Send in DM"
              checked={formData.responseInDM}
              onChange={e => handleInputChange('responseInDM', e.target.checked)}
            />
          </div>
          <div className="qft-field">
            <Switch
              label="Delete Trigger"
              checked={formData.deleteTrigger}
              onChange={e => handleInputChange('deleteTrigger', e.target.checked)}
            />
          </div>
        </div>

        <div className="qft-field">
           <label className="qft-label">Delete Response After (seconds)</label>
           <input
             type="number"
             className="qft-input"
             value={formData.deleteResponse}
             onChange={e => handleInputChange('deleteResponse', parseInt(e.target.value) || 0)}
             min="0" max="300"
           />
           <small>0 = Never delete</small>
        </div>

        <div className="qft-field">
          <label className="qft-label">Response Code</label>
          <div className="template-toolbar">
            <button className="qft-button-small" onClick={() => insertTemplate('welcome')}>Welcome</button>
            <button className="qft-button-small" onClick={() => insertTemplate('userinfo')}>User Info</button>
            <button className="qft-button-small" onClick={() => insertTemplate('random')}>Random</button>
            <button className="qft-button-small" onClick={() => insertTemplate('embed')}>Embed</button>
            <button className="qft-button-small" onClick={() => insertTemplate('conditional')}>If/Else</button>
            <button className="qft-button-small" onClick={() => insertTemplate('args')}>Args</button>
          </div>
          <div style={{ height: '400px', marginTop: '10px' }}>
            <TemplateEditor
              value={formData.commandCode}
              onChange={(code) => handleInputChange('commandCode', code)}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderRestrictionsTab() {
    return (
      <div className="tab-panel">
        <div className="qft-field">
          <label className="qft-label">Required Roles</label>
          <RoleSelector
            value={formData.requireRoles}
            onChange={(roles) => handleInputChange('requireRoles', roles)}
            multiple
          />
        </div>
        <div className="qft-field">
          <label className="qft-label">Ignored Roles</label>
          <RoleSelector
            value={formData.ignoreRoles}
            onChange={(roles) => handleInputChange('ignoreRoles', roles)}
            multiple
          />
        </div>
        <div className="qft-field">
          <label className="qft-label">Required Channels</label>
          <ChannelSelector
            value={formData.requireChannels}
            onChange={(channels) => handleInputChange('requireChannels', channels)}
            multiple
          />
        </div>
        <div className="qft-field">
          <label className="qft-label">Ignored Channels</label>
          <ChannelSelector
            value={formData.ignoreChannels}
            onChange={(channels) => handleInputChange('ignoreChannels', channels)}
            multiple
          />
        </div>
        <div className="qft-field">
          <Switch
            label="Command Enabled"
            checked={formData.enabled}
            onChange={e => handleInputChange('enabled', e.target.checked)}
          />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="module-container custom-command-builder-module">
        <div className="module-header">
          <h2><FaCode /> Custom Commands</h2>
        </div>
        <div className="empty-state">
          <p>You must be logged in to view or manage custom commands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container custom-command-builder-module">
      <div className="module-header">
        <h2><FaCode /> Custom Commands</h2>
        <div className="header-actions">
          {!editing && (
            <>
              <button className="qft-button secondary" onClick={handleRefreshSlash} title="Force sync slash commands to Discord">
                <FaSyncAlt /> Sync Slash
              </button>
              <button className="qft-button primary" onClick={() => { resetForm(); setEditing(true); }}>
                <FaPlus /> New Command
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced options and help button removed */}

      {/* Help panel removed */}

      {editing ? (
        <div className="editor-container command-editor">
          <div className="editor-tabs tabs">
            <button className={`tab tab-btn ${activeTab === 'trigger' ? 'active' : ''}`} onClick={() => setActiveTab('trigger')}>Trigger</button>
            <button className={`tab tab-btn ${activeTab === 'response' ? 'active' : ''}`} onClick={() => setActiveTab('response')}>Response & Code</button>
            <button className={`tab tab-btn ${activeTab === 'restrictions' ? 'active' : ''}`} onClick={() => setActiveTab('restrictions')}>Restrictions</button>
          </div>
          
          <div className="editor-content">
            {activeTab === 'trigger' && rendertriggerTab()}
            {activeTab === 'response' && renderResponseTab()}
            {activeTab === 'restrictions' && renderRestrictionsTab()}
          </div>

          <div className="editor-actions">
            <button className="qft-button primary" onClick={handleSave}>
              <FaSave /> {editingCommandIndex !== null && editingCommandIndex !== undefined ? 'Update Command' : 'Save Command'}
            </button>
            <button className="qft-button secondary" onClick={resetForm}>
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="commands-list">
          {loading ? (
            <p>Loading commands...</p>
          ) : Array.isArray(commands) && commands.length > 0 ? (
            <div className="command-cards grid-list">
              {commands.map(cmd => {
                // Get trigger value for display
                let triggerValue = '';
                let triggerInfo = '';
                if (cmd.trigger_data) {
                  if (cmd.trigger_data.trigger) {
                    triggerValue = cmd.trigger_data.trigger;
                    triggerInfo = `Trigger: ${cmd.trigger_data.trigger}`;
                  }
                  if (cmd.trigger_data.customId) triggerInfo = `Custom ID: ${cmd.trigger_data.customId}`;
                  if (cmd.trigger_data.emoji) {
                    triggerInfo = `Emoji: ${cmd.trigger_data.emoji}`;
                    if (cmd.trigger_data.reactionEventType) {
                      triggerInfo += ` (${cmd.trigger_data.reactionEventType})`;
                    }
                  }
                  if (cmd.trigger_data.scheduleTime) triggerInfo = `Schedule: ${cmd.trigger_data.scheduleTime}`;
                }
                const displayIndex = cmd.command_index ?? cmd.id;
                const displayName = cmd.name || cmd.command_name || triggerValue || `Command #${displayIndex}`;
                return (
                  <div key={`${cmd.id}-${displayIndex}`} className="command-card">
                    <div className="card-header command-header">
                      <div className="command-info command-title">
                        <span className="command-id">ID: {displayIndex}</span>

                        
                        <span> Type: </span> <span className={`badge ${cmd.trigger_type}`}>{cmd.trigger_type}</span>
                        
                        <strong>{displayName}</strong>
                        
                      </div>
                      <div className="card-actions command-actions">
                        <button className="qft-button-icon" onClick={() => handleEdit(cmd)}><FaEdit /></button>
                        <button className="qft-button-icon danger" onClick={() => handleDelete(displayIndex)}><FaTrash /></button>
                      </div>
                    </div>
                    <p className="command-description">{cmd.description || 'No description'}</p>
                    <div className="command-meta">
                      {cmd.cooldown_seconds > 0 && <span className="meta-tag">⏳ {cmd.cooldown_seconds}s</span>}
                      {!cmd.enabled && <span className="meta-tag disabled">Disabled</span>}
                    </div>
                    <div className="command-stats">
                      {triggerInfo && <span className="trigger-display"><strong>{triggerInfo}</strong></span>}
                      <span>Executions: {cmd.execution_count || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No commands found.</p>
              <button className="qft-button primary" onClick={() => { resetForm(); setEditing(true); }}>Create One</button>
            </div>
          )}
        </div>
      )}

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