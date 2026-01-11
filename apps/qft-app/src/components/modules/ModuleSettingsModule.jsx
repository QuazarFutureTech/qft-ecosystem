import React, { useEffect, useMemo, useState } from 'react';
import Switch from '../elements/Switch';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { fetchModuleSettings, toggleModule } from '../../services/moduleSettings';
import './ModuleManagerModule.css';

const MODULE_COPY = {
  commands: 'Slash commands, context menus, and command routing.',
  moderation: 'Core moderation actions like bans, kicks, mutes, and slowmode.',
  automod: 'Automated filters, keyword triggers, and rule enforcement.',
  logging: 'Audit and event logging to configured channels.',
  analytics: 'Engagement and usage metrics collection.',
  scheduler: 'Scheduled tasks such as reminders or timed announcements.',
  tickets: 'Support ticket workflows and thread helpers.',
  webhooks: 'Webhook relays and bridge handlers.',
  ai_integration: 'AI helpers, summaries, and generative responses.',
};

function ModuleSettingsModule() {
  const { userGuilds } = useUser();
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingModule, setSavingModule] = useState('');

  const token = useMemo(() => localStorage.getItem('qft-token'), []);

  // Ensure a guild is selected on mount
  useEffect(() => {
    if (!selectedGuildId && userGuilds && userGuilds.length > 0) {
      setSelectedGuildId(userGuilds[0].id);
    }
  }, [selectedGuildId, userGuilds, setSelectedGuildId]);

  useEffect(() => {
    if (!selectedGuildId) return;
    const loadModules = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchModuleSettings(selectedGuildId, token);
        setModules(data.modules || {});
      } catch (err) {
        console.error('Failed to load module settings', err);
        setError(err.message || 'Failed to load module settings');
      } finally {
        setLoading(false);
      }
    };
    loadModules();
  }, [selectedGuildId, token]);

  const handleToggle = async (moduleName) => {
    if (!selectedGuildId) return;
    const newValue = !(modules[moduleName] !== false);
    setSavingModule(moduleName);
    setModules((prev) => ({ ...prev, [moduleName]: newValue }));
    try {
      const result = await toggleModule(selectedGuildId, moduleName, newValue, token);
      setModules(result.modules || {});
    } catch (err) {
      console.error('Failed to toggle module', err);
      setModules((prev) => ({ ...prev, [moduleName]: !newValue }));
      setError(err.message || 'Failed to toggle module');
    } finally {
      setSavingModule('');
    }
  };

  const guildOptions = userGuilds || [];
  const sortedModules = Object.entries(modules || {}).sort(([a], [b]) => a.localeCompare(b));

  if (!guildOptions.length) {
    return (
      <div className="qft-card">
        <h2>Module Settings</h2>
        <p>You need to join a guild before toggling modules.</p>
      </div>
    );
  }

  return (
    <div className="qft-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0' }}>Module Settings</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Toggle core systems on or off for the selected guild.
          </p>
        </div>
        <div>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Guild</label>
          <select
            value={selectedGuildId || ''}
            onChange={(e) => setSelectedGuildId(e.target.value)}
            className="qft-input"
            style={{ minWidth: 220 }}
          >
            {guildOptions.map((guild) => (
              <option key={guild.id} value={guild.id}>{guild.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="qft-alert qft-alert-danger" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: 16 }}>Loading module settings…</p>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {sortedModules.map(([moduleName, enabled]) => (
            <div key={moduleName} className="module-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{moduleName.replace('_', ' ')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {MODULE_COPY[moduleName] || 'Toggle this module for your guild.'}
                </div>
              </div>
              <Switch
                checked={enabled !== false}
                onChange={() => handleToggle(moduleName)}
                disabled={!!savingModule && savingModule !== moduleName}
                ariaLabel={`Toggle ${moduleName}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModuleSettingsModule;
