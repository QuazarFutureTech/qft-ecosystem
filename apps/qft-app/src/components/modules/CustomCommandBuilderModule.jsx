import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
import TemplateEditor from '../TemplateEditor.jsx';
import { listCommands, createCommand, updateCommand, deleteCommand, refreshCustomCommands } from '../../services/customCommands';
import { ChannelSelector, RoleSelector } from '../elements/GuildDropdowns.jsx';
import { FaPlus, FaTrash, FaEdit, FaCog, FaCode, FaBook, FaSave, FaTimes, FaSyncAlt } from 'react-icons/fa';
import '../modules.css';
import './CustomCommandBuilderModule.css';

export default function CustomCommandsModule() {
  const { selectedGuildId } = useSelectedGuild();
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCommandId, setEditingCommandId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [showHelp, setShowHelp] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  // Form state
  const [formData, setFormData] = useState({
    commandName: '',
    commandCode: '',
    description: '',
    triggerType: 'command',
    triggerOnEdit: false,
    caseSensitive: false,
    responseType: 'text',
    responseInDM: false,
    deleteTrigger: false,
    deleteResponse: 0,
    cooldownSeconds: 0,
    requireRoles: [],
    ignoreRoles: [],
    requireChannels: [],
    ignoreChannels: [],
    enabled: true,
    isEphemeral: false
  });

  const token = localStorage.getItem('qft-token');

  useEffect(() => {
    if (selectedGuildId) {
      loadCommands();
    }
  }, [selectedGuildId]);

  const loadCommands = async () => {
    setLoading(true);
    const result = await listCommands(selectedGuildId, token);
    setLoading(false);
    if (result.success) {
      setCommands(result.commands);
    } else {
      showAlert(`Failed to load commands: ${result.message}`);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.commandName.trim() || !formData.commandCode.trim()) {
      showAlert('Command name and response code are required');
      return;
    }

    let result;
    if (editingCommandId) {
      // Update existing command
      result = await updateCommand(editingCommandId, formData, token);
    } else {
      // Create new command
      result = await createCommand(selectedGuildId, formData, token);
    }
    
    if (result.success) {
      showAlert(editingCommandId ? 'Command updated successfully!' : 'Command created successfully!');
      setEditing(false);
      resetForm();
      loadCommands();
    } else {
      showAlert(`Error: ${result.message}`);
    }
  };

  const handleDelete = async (commandId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this command?');
    if (!confirmed) return;

    const result = await deleteCommand(commandId, token);
    
    if (result.success) {
      showAlert('Command deleted successfully');
      loadCommands();
    } else {
      showAlert(`Error: ${result.message}`);
    }
  };

  const handleRefreshCommands = async () => {
    const confirmed = await showConfirm('Refresh custom slash commands? This will update Discord with the latest commands from the database.');
    if (!confirmed) return;

    setLoading(true);
    const result = await refreshCustomCommands(selectedGuildId, token);
    setLoading(false);
    
    if (result.success) {
      showAlert('✅ Custom slash commands refreshed successfully!');
    } else {
      showAlert(`Error: ${result.message}`);
    }
  };

  const handleEdit = (command) => {
    setEditingCommandId(command.id);
    setFormData({
      commandName: command.command_name || '',
      commandCode: command.command_code || '',
      description: command.description || '',
      triggerType: command.trigger_type || 'command',
      triggerOnEdit: command.trigger_on_edit || false,
      caseSensitive: command.case_sensitive || false,
      responseType: command.response_type || 'text',
      responseInDM: command.response_in_dm || false,
      deleteTrigger: command.delete_trigger || false,
      deleteResponse: command.delete_response || 0,
      cooldownSeconds: command.cooldown_seconds || 0,
      requireRoles: Array.isArray(command.require_roles) ? command.require_roles : [],
      ignoreRoles: Array.isArray(command.ignore_roles) ? command.ignore_roles : [],
      requireChannels: Array.isArray(command.require_channels) ? command.require_channels : [],
      ignoreChannels: Array.isArray(command.ignore_channels) ? command.ignore_channels : [],
      enabled: command.enabled !== false,
      isEphemeral: command.is_ephemeral || false
    });
    setEditing(true);
    setActiveTab('basic');
  };

  const resetForm = () => {
    setEditingCommandId(null);
    setFormData({
      commandName: '',
      commandCode: '',
      description: '',
      triggerType: 'command',
      triggerOnEdit: false,
      caseSensitive: false,
      responseType: 'text',
      responseInDM: false,
      deleteTrigger: false,
      deleteResponse: 0,
      cooldownSeconds: 0,
      requireRoles: [],
      ignoreRoles: [],
      requireChannels: [],
      ignoreChannels: [],
      enabled: true,
      isEphemeral: false
    });
    setActiveTab('basic');
  };

  const insertTemplate = (template) => {
    const templates = {
      welcome: '{{userName}}, welcome to {{serverName}}! 🎉',
      userinfo: 'User: {{userMention userID}}\\nAccount created: {{formatTime .User.CreatedAt "short"}}',
      random: 'You rolled: {{randInt 1 100}}',
      embed: '{{$embed := createEmbed "Title" "Description" "#5865F2"}}\\n{{addField $embed "Field 1" "Value 1" false}}\\n{{json $embed}}',
      conditional: '{{if eq .User.ID "123456789"}}\\nHello admin!\\n{{else}}\\nHello user!\\n{{end}}',
      args: '{{if gt (len .Args) 0}}\\nYou said: {{joinArgs " "}}\\n{{else}}\\nPlease provide arguments!\\n{{end}}'
    };
    
    handleInputChange('commandCode', formData.commandCode + (formData.commandCode ? '\\n' : '') + templates[template]);
  };

  return (
    <div className="qft-module custom-command-builder-module">
      <div className="module-header">
        <h2>Custom Commands</h2>
        <div className="header-actions">
          <button className="qft-button secondary" onClick={handleRefreshCommands} disabled={loading}>
            <FaSyncAlt /> Refresh Slash Commands
          </button>
          <button className="qft-button secondary" onClick={() => setShowHelp(!showHelp)}>
            <FaBook /> Template Help
          </button>
          {!editing && (
            <button className="qft-button primary" onClick={() => { resetForm(); setEditing(true); }}>
              <FaPlus /> New Command
            </button>
          )}
        </div>
      </div>

      {showHelp && (
        <div className="help-panel">
          <div className="help-header">
            <h3>Template Functions</h3>
            <button className="qft-button-icon" onClick={() => setShowHelp(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="help-content">
            <div className="help-section">
              <h4>User Functions</h4>
              <code>{'{{userName}}'}</code> - User's name<br/>
              <code>{'{{userMention userID}}'}</code> - Mention user<br/>
              <code>{'{{userID}}'}</code> - User's ID
            </div>
            <div className="help-section">
              <h4>Server Functions</h4>
              <code>{'{{serverName}}'}</code> - Server name<br/>
              <code>{'{{memberCount}}'}</code> - Total members<br/>
              <code>{'{{channelName .Channel}}'}</code> - Channel name
            </div>
            <div className="help-section">
              <h4>Math & Random</h4>
              <code>{'{{randInt 1 100}}'}</code> - Random number<br/>
              <code>{'{{add 5 3}}'}</code> - Addition (8)<br/>
              <code>{'{{mult 4 2}}'}</code> - Multiplication (8)
            </div>
            <div className="help-section">
              <h4>String Functions</h4>
              <code>{'{{upper "text"}}'}</code> - UPPERCASE<br/>
              <code>{'{{lower "TEXT"}}'}</code> - lowercase<br/>
              <code>{'{{slice "hello" 0 2}}'}</code> - Substring
            </div>
            <div className="help-section">
              <h4>Arguments</h4>
              <code>{'{{arg 0}}'}</code> - First argument<br/>
              <code>{'{{joinArgs " "}}'}</code> - All args joined<br/>
              <code>{'{{argCount}}'}</code> - Number of args
            </div>
          </div>
        </div>
      )}

      {editing ? (
        <div className="command-editor">
          <div className="editor-tabs">
            <button 
              className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic
            </button>
            <button 
              className={`tab ${activeTab === 'trigger' ? 'active' : ''}`}
              onClick={() => setActiveTab('trigger')}
            >
              Trigger
            </button>
            <button 
              className={`tab ${activeTab === 'response' ? 'active' : ''}`}
              onClick={() => setActiveTab('response')}
            >
              Response
            </button>
            <button 
              className={`tab ${activeTab === 'restrictions' ? 'active' : ''}`}
              onClick={() => setActiveTab('restrictions')}
            >
              Restrictions
            </button>
          </div>

          <div className="editor-content">
            {activeTab === 'basic' && (
              <div className="tab-panel">
                <div className="qft-field">
                  <label className="qft-label">Command Name/Trigger</label>
                  <input
                    type="text"
                    className="qft-input"
                    value={formData.commandName}
                    onChange={e => handleInputChange('commandName', e.target.value)}
                    placeholder="welcome"
                  />
                  <small>The word or phrase that triggers this command (without prefix)</small>
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
            )}

            {activeTab === 'trigger' && (
              <div className="tab-panel">
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
                      <option value="select_menu">Select Menu</option>
                    </optgroup>
                  </select>
                  <small>
                    {formData.triggerType === 'command' && 'Triggered when message starts with prefix + trigger'}
                    {formData.triggerType === 'contains' && 'Triggered when trigger text appears anywhere in message'}
                    {formData.triggerType === 'regex' && 'Triggered when message matches regex pattern'}
                    {formData.triggerType === 'slash' && 'Triggered via Discord slash command (/) - automatically registered'}
                    {formData.triggerType === 'button' && 'Triggered when a button with matching customId is clicked'}
                    {formData.triggerType === 'modal' && 'Triggered when a modal with matching customId is submitted'}
                    {formData.triggerType === 'select_menu' && 'Triggered when a select menu with matching customId is used'}
                  </small>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Case Sensitive"
                    checked={formData.caseSensitive}
                    onChange={e => handleInputChange('caseSensitive', e.target.checked)}
                  />
                  <small>If checked, "Hello" and "hello" will be treated differently</small>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Trigger on Edit"
                    checked={formData.triggerOnEdit}
                    onChange={e => handleInputChange('triggerOnEdit', e.target.checked)}
                  />
                  <small>Also trigger when a message is edited</small>
                </div>
              </div>
            )}

            {activeTab === 'response' && (
              <div className="tab-panel">
                <div className="qft-field">
                  <label className="qft-label">Response Type</label>
                  <select
                    className="qft-select"
                    value={formData.responseType}
                    onChange={e => handleInputChange('responseType', e.target.value)}
                  >
                    <option value="text">Plain Text</option>
                    <option value="embed">Embed (JSON)</option>
                  </select>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Send Response in DM"
                    checked={formData.responseInDM}
                    onChange={e => handleInputChange('responseInDM', e.target.checked)}
                  />
                  <small>Send the response as a private message to the user</small>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Ephemeral Response"
                    checked={formData.isEphemeral}
                    onChange={e => handleInputChange('isEphemeral', e.target.checked)}
                  />
                  <small>Only the user who triggered the command can see the response (Discord interactions only)</small>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Delete Trigger Message"
                    checked={formData.deleteTrigger}
                    onChange={e => handleInputChange('deleteTrigger', e.target.checked)}
                  />
                  <small>Automatically delete the message that triggered this command</small>
                </div>

                <div className="qft-field">
                  <label className="qft-label">Auto-delete Response (seconds)</label>
                  <input
                    type="number"
                    className="qft-input"
                    value={formData.deleteResponse}
                    onChange={e => handleInputChange('deleteResponse', parseInt(e.target.value) || 0)}
                    min="0"
                    max="300"
                  />
                  <small>0 = Don't auto-delete. Max 300 seconds (5 minutes)</small>
                </div>

                <div className="qft-field">
                  <label className="qft-label">Cooldown (seconds)</label>
                  <input
                    type="number"
                    className="qft-input"
                    value={formData.cooldownSeconds}
                    onChange={e => handleInputChange('cooldownSeconds', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                  <small>Minimum time between command uses by the same user</small>
                </div>
              </div>
            )}

            {activeTab === 'restrictions' && (
              <div className="tab-panel">
                <div className="qft-field">
                  <label className="qft-label">Required Roles</label>
                  <RoleSelector
                    value={formData.requireRoles}
                    onChange={(roles) => handleInputChange('requireRoles', roles)}
                    multiple
                    placeholder="Select roles..."
                  />
                  <small>User must have at least one of these roles. Leave empty for no restriction.</small>
                </div>

                <div className="qft-field">
                  <label className="qft-label">Ignored Roles</label>
                  <RoleSelector
                    value={formData.ignoreRoles}
                    onChange={(roles) => handleInputChange('ignoreRoles', roles)}
                    multiple
                    placeholder="Select roles to ignore..."
                  />
                  <small>Users with these roles cannot use this command</small>
                </div>

                <div className="qft-field">
                  <label className="qft-label">Required Channels</label>
                  <ChannelSelector
                    value={formData.requireChannels}
                    onChange={(channels) => handleInputChange('requireChannels', channels)}
                    multiple
                    placeholder="Select channels..."
                  />
                  <small>Command only works in these channels. Leave empty for all channels.</small>
                </div>

                <div className="qft-field">
                  <label className="qft-label">Ignored Channels</label>
                  <ChannelSelector
                    value={formData.ignoreChannels}
                    onChange={(channels) => handleInputChange('ignoreChannels', channels)}
                    multiple
                    placeholder="Select channels to ignore..."
                  />
                  <small>Command won't work in these channels</small>
                </div>

                <div className="qft-field">
                  <Switch
                    label="Enabled"
                    checked={formData.enabled}
                    onChange={e => handleInputChange('enabled', e.target.checked)}
                  />
                  <small>Uncheck to temporarily disable this command</small>
                </div>
              </div>
            )}
          </div>

          <div className="editor-actions">
            <button className="qft-button primary" onClick={handleSave}>
              <FaSave /> {editingCommandId ? 'Update Command' : 'Save Command'}
            </button>
            <button className="qft-button secondary" onClick={() => { setEditing(false); resetForm(); }}>
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="commands-list">
          {loading ? (
            <p>Loading commands...</p>
          ) : commands.length === 0 ? (
            <div className="empty-state">
              <p>No custom commands yet. Create your first command!</p>
            </div>
          ) : (
            <div className="command-cards">
              {commands.map(cmd => (
                <div key={cmd.id} className="command-card">
                  <div className="card-header">
                    <div className="command-info">
                      <h3>
                        {cmd.trigger_type === 'command' && '!'}
                        {cmd.command_name}
                      </h3>
                      <span className={`badge ${cmd.trigger_type}`}>
                        {cmd.trigger_type}
                      </span>
                      {!cmd.enabled && <span className="badge disabled">Disabled</span>}
                    </div>
                    <div className="card-actions">
                      <button className="qft-button-icon" title="Edit" onClick={() => handleEdit(cmd)}>
                        <FaEdit />
                      </button>
                      <button className="qft-button-icon" title="Delete" onClick={() => handleDelete(cmd.id)}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <p className="command-description">{cmd.description || 'No description'}</p>
                  <div className="command-stats">
                    <span>Executions: {cmd.execution_count || 0}</span>
                    {cmd.cooldown_seconds > 0 && <span>Cooldown: {cmd.cooldown_seconds}s</span>}
                  </div>
                </div>
              ))}
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
