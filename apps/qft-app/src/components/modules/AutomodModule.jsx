import React, { useState } from 'react';
import Switch from '../elements/Switch';
import Button from '../elements/Button';
import { fetchGuildConfig, saveGuildConfig, fetchGuildRoles, fetchGuildChannels } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import ConfirmModal from '../elements/ConfirmModal';
import { useGuildModuleSettings } from '../../contexts/GuildModuleSettingsContext.jsx';
import { useModal } from '../../hooks/useModal.jsx';

export default function AutomodModule({ guildId: guildIdProp }){
  const { userGuilds } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const { isEnabled } = useGuildModuleSettings();
  const guildId = guildIdProp || selectedGuildId || userGuilds?.[0]?.id;
  const { showAlert } = useModal();

  // Feature flags
  const [slowmodeEnabled, setSlowmodeEnabled] = useState(true);
  const [mentionEnabled, setMentionEnabled] = useState(true);
  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [linksEnabled, setLinksEnabled] = useState(true);
  const [bannedWordsEnabled, setBannedWordsEnabled] = useState(false);
  const [bannedWebsitesEnabled, setBannedWebsitesEnabled] = useState(false);

  // Slowmode settings
  const [spamThreshold, setSpamThreshold] = useState(6);
  const [spamIntervalSeconds, setSpamIntervalSeconds] = useState(10);

  // Mass Mention settings
  const [mentionLimit, setMentionLimit] = useState(5);

  // Banned words & websites
  const [blockedWordsText, setBlockedWordsText] = useState('');
  const [linkWhitelistText, setLinkWhitelistText] = useState('');
  const [linkBlacklistText, setLinkBlacklistText] = useState('');

  // Bypass settings
  const [ignoredRoles, setIgnoredRoles] = useState([]);
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('slowmode');

  // Load config
  React.useEffect(() => {
    const load = async () => {
      if (!guildId) return;
      const token = localStorage.getItem('qft-token');
      const res = await fetchGuildConfig(guildId, token);
      const a = res.success && res.data.settings?.automod;
      if (a) {
        setSlowmodeEnabled(a.slowmodeEnabled ?? true);
        setSpamThreshold(a.spamThreshold ?? 6);
        setSpamIntervalSeconds(a.spamIntervalSeconds ?? 10);
        setMentionEnabled(a.mentionEnabled ?? true);
        setMentionLimit(a.mentionLimit ?? 5);
        setInviteEnabled(a.inviteEnabled ?? false);
        setLinksEnabled(a.linksEnabled ?? true);
        setBannedWordsEnabled(a.bannedWordsEnabled ?? false);
        setBlockedWordsText(Array.isArray(a.blockedWords) ? a.blockedWords.join(', ') : (a.blockedWords || ''));
        setBannedWebsitesEnabled(a.bannedWebsitesEnabled ?? false);
        setLinkWhitelistText(Array.isArray(a.linkWhitelist) ? a.linkWhitelist.join(', ') : (a.linkWhitelist || ''));
        setLinkBlacklistText(Array.isArray(a.linkBlacklist) ? a.linkBlacklist.join(', ') : (a.linkBlacklist || ''));
        setIgnoredRoles(Array.isArray(a.ignoredRoles) ? a.ignoredRoles : []);
        setIgnoredChannels(Array.isArray(a.ignoredChannels) ? a.ignoredChannels : []);
      }
    };
    load();
  }, [guildId]);

  // Load roles and channels
  React.useEffect(() => {
    const load = async () => {
      if (!guildId) return;
      const token = localStorage.getItem('qft-token');
      const rolesRes = await fetchGuildRoles(guildId, token);
      if (rolesRes.success && Array.isArray(rolesRes.data)) setRoles(rolesRes.data);
      const channelsRes = await fetchGuildChannels(guildId, token);
      if (channelsRes.success && Array.isArray(channelsRes.data)) setChannels(channelsRes.data);
    };
    load();
  }, [guildId]);

  const handleSave = async () => {
    if (!guildId) return showAlert('No guild selected');
    setLoading(true);
    const token = localStorage.getItem('qft-token');
    const blockedWords = blockedWordsText.split(',').map(w => w.trim()).filter(Boolean);
    const linkWhitelist = linkWhitelistText.split(',').map(w => w.trim()).filter(Boolean);
    const linkBlacklist = linkBlacklistText.split(',').map(w => w.trim()).filter(Boolean);
    const payload = {
      settings: {
        automod: {
          slowmodeEnabled, spamThreshold, spamIntervalSeconds,
          mentionEnabled, mentionLimit,
          inviteEnabled,
          linksEnabled,
          bannedWordsEnabled, blockedWords,
          bannedWebsitesEnabled, linkWhitelist, linkBlacklist,
          ignoredRoles, ignoredChannels,
        }
      }
    };
    const res = await saveGuildConfig(guildId, payload, token);
    setLoading(false);
    await showAlert(res.success ? 'Automod settings saved' : `Failed: ${res.message}`);
  };

  if (!isEnabled('automod')) {
    return (
      <div className="qft-card">
        <h2>Automod</h2>
        <p style={{ color: 'var(--text-muted)' }}>This module is disabled for the selected guild.</p>
      </div>
    );
  }

  const tabStyle = {
    display: 'flex',
    gap: 8,
    borderBottom: '2px solid var(--border-subtle)',
    marginBottom: 16,
    paddingBottom: 0,
    flexWrap: 'wrap'
  };

  const tabButtonStyle = (isActive) => ({
    padding: '10px 16px',
    background: isActive ? 'var(--accent-primary)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    borderRadius: '4px 4px 0 0',
    transition: 'all 0.2s'
  });

  return (
    <div className="qft-card">
      <h2>Automod</h2>

      {/* Tab Navigation */}
      <div style={tabStyle}>
        <button style={tabButtonStyle(activeTab === 'slowmode')} onClick={() => setActiveTab('slowmode')}>
          Slowmode
        </button>
        <button style={tabButtonStyle(activeTab === 'mention')} onClick={() => setActiveTab('mention')}>
          Mass Mention
        </button>
        <button style={tabButtonStyle(activeTab === 'invites')} onClick={() => setActiveTab('invites')}>
          Server Invites
        </button>
        <button style={tabButtonStyle(activeTab === 'links')} onClick={() => setActiveTab('links')}>
          Links
        </button>
        <button style={tabButtonStyle(activeTab === 'words')} onClick={() => setActiveTab('words')}>
          Banned words
        </button>
        <button style={tabButtonStyle(activeTab === 'websites')} onClick={() => setActiveTab('websites')}>
          Banned websites
        </button>
        <button style={tabButtonStyle(activeTab === 'bypass')} onClick={() => setActiveTab('bypass')}>
          Bypass
        </button>
      </div>

      {/* Slowmode Tab */}
      {activeTab === 'slowmode' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Slowmode</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Limit message rate per user</div>
            </div>
            <Switch checked={slowmodeEnabled} onChange={e => setSlowmodeEnabled(e.target.checked)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="qft-label">Messages</label>
              <input type="number" min={2} max={50} value={spamThreshold} onChange={e => setSpamThreshold(Number(e.target.value))} className="qft-input" />
            </div>
            <div>
              <label className="qft-label">Seconds</label>
              <input type="number" min={3} max={120} value={spamIntervalSeconds} onChange={e => setSpamIntervalSeconds(Number(e.target.value))} className="qft-input" />
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Flag/delete when {spamThreshold}+ messages in {spamIntervalSeconds}s.</p>
        </div>
      )}

      {/* Mass Mention Tab */}
      {activeTab === 'mention' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Mass Mention</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Limit mentions per message</div>
            </div>
            <Switch checked={mentionEnabled} onChange={e => setMentionEnabled(e.target.checked)} />
          </div>
          <div>
            <label className="qft-label">Max mentions per message</label>
            <input type="number" min={1} max={20} value={mentionLimit} onChange={e => setMentionLimit(Number(e.target.value))} className="qft-input" />
          </div>
        </div>
      )}

      {/* Server Invites Tab */}
      {activeTab === 'invites' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Block Discord Invites</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Prevent invite links in messages</div>
            </div>
            <Switch checked={inviteEnabled} onChange={e => setInviteEnabled(e.target.checked)} />
          </div>
        </div>
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Link Detection</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Flag messages with URLs</div>
            </div>
            <Switch checked={linksEnabled} onChange={e => setLinksEnabled(e.target.checked)} />
          </div>
        </div>
      )}

      {/* Banned Words Tab */}
      {activeTab === 'words' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Banned Words</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Filter specific words/phrases</div>
            </div>
            <Switch checked={bannedWordsEnabled} onChange={e => setBannedWordsEnabled(e.target.checked)} />
          </div>
          <div className="qft-field">
            <label className="qft-label">Words/phrases (comma separated)</label>
            <textarea className="qft-input" rows={3} value={blockedWordsText} onChange={e => setBlockedWordsText(e.target.value)} placeholder="spam, scam, badword" />
          </div>
        </div>
      )}

      {/* Banned Websites Tab */}
      {activeTab === 'websites' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Banned Websites</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Whitelist/blacklist URLs</div>
            </div>
            <Switch checked={bannedWebsitesEnabled} onChange={e => setBannedWebsitesEnabled(e.target.checked)} />
          </div>
          <div className="qft-field" style={{ marginBottom: 12 }}>
            <label className="qft-label">Link whitelist (comma separated)</label>
            <textarea className="qft-input" rows={2} value={linkWhitelistText} onChange={e => setLinkWhitelistText(e.target.value)} placeholder="discord.com, yourdomain.com" />
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Allowed domains (if empty, all links blocked).</p>
          </div>
          <div className="qft-field">
            <label className="qft-label">Link blacklist (comma separated)</label>
            <textarea className="qft-input" rows={2} value={linkBlacklistText} onChange={e => setLinkBlacklistText(e.target.value)} placeholder="malicious.com, phishing.io" />
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Blocked domains.</p>
          </div>
        </div>
      )}

      {/* Bypass Tab */}
      {activeTab === 'bypass' && (
        <div>
          <div className="qft-field" style={{ marginBottom: 16 }}>
            <label className="qft-label">Ignored roles (bypass automod)</label>
            {roles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No roles available.</p>
            ) : (
              <select
                multiple
                value={ignoredRoles}
                onChange={e => setIgnoredRoles(Array.from(e.target.selectedOptions, opt => opt.value))}
                className="qft-input"
                style={{ minHeight: '120px' }}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Users with these roles bypass all automod checks.</p>
          </div>

          <div className="qft-field">
            <label className="qft-label">Ignored channels (bypass automod)</label>
            {channels.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No channels available.</p>
            ) : (
              <select
                multiple
                value={ignoredChannels}
                onChange={e => setIgnoredChannels(Array.from(e.target.selectedOptions, opt => opt.value))}
                className="qft-input"
                style={{ minHeight: '120px' }}
              >
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Messages in these channels bypass all automod checks.</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="primary" onClick={handleSave}>{loading ? 'Saving...' : 'Save Automod Settings'}</Button>
      </div>
    </div>
  );
}
