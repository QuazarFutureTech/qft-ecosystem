import React, { useEffect, useState } from 'react';
import QFTPreloader from '../components/QFTPreloader';
import AutomodModule from '../components/modules/AutomodModule';
import CommandToggleModule from '../components/modules/CommandToggleModule';
import WelcomeModule from '../components/modules/WelcomeModule';
import SettingsModule from '../components/modules/SettingsModule';
import ScheduledEmbedsModule from '../components/modules/ScheduledEmbedsModule';
import CustomCommandBuilderModule from '../components/modules/CustomCommandBuilderModule';
import AutomodRuleTesterModule from '../components/modules/AutomodRuleTesterModule';
import ModerationQuickActionsModule from '../components/modules/ModerationQuickActionsModule';
import RolePermissionManagerModule from '../components/modules/RolePermissionManagerModule';
import { useUser } from '../contexts/UserContext.jsx';
import { useSelectedGuild } from '../contexts/SelectedGuildContext.jsx';
import { fetchGuildChannels } from '../services/admin';

function Settings() {
  const { isLoadingUser, qftRole, userGuilds, userStatus } = useUser();
  const { selectedGuildId, setSelectedGuildId, selectedChannelId, setSelectedChannelId } = useSelectedGuild();
  const hasAdminAccess = qftRole && ['alpha_owner', 'omega_executive', 'level_3_management'].includes(qftRole);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(null);

  useEffect(() => {
    if (userStatus && userGuilds && userGuilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(userGuilds[0].id);
    }
  }, [userStatus, userGuilds, selectedGuildId, setSelectedGuildId]);

  useEffect(() => {
    const loadChannels = async () => {
      if (!selectedGuildId || !userStatus) {
        setChannels([]);
        return;
      }
      setChannelsLoading(true);
      setChannelsError(null);
      try {
        const token = localStorage.getItem('qft-token');
        if (!token) {
          setChannelsError(new Error('Authentication token not found.'));
          setChannelsLoading(false);
          return;
        }
        const result = await fetchGuildChannels(selectedGuildId, token);
        if (result.success) {
          setChannels(result.data);
        } else {
          setChannelsError(new Error(result.message));
        }
      } catch (err) {
        setChannelsError(err);
      } finally {
        setChannelsLoading(false);
      }
    };
    loadChannels();
  }, [selectedGuildId, userStatus]);

  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Settings</h2>
          <p>You need elevated permissions to manage guild settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 className="admin-dashboard-title">Guild & Theme Settings</h1>
      <p className="section-description">Configure automod, command categories, welcome messaging, and your visual theme in one place.</p>
      {/* Guilds section with selector and channels list */}
      <div className="qft-card admin-section" style={{ marginBottom: 16 }}>
        <h2>Guilds</h2>
        {userGuilds.length === 0 ? (
          <p>Not a member of any guilds where the bot is present.</p>
        ) : (
          <>
            <label htmlFor="guild-select" className="qft-label">Select a Guild:</label>
            <select
              id="guild-select"
              value={selectedGuildId}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              className="qft-select"
              style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid var(--border-color)', marginBottom: '15px' }}
            >
              {userGuilds.map(guild => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>

            {selectedGuildId && (
              <div style={{ marginTop: '10px' }}>
                <h4>Channel</h4>
                {channelsLoading ? (
                  <p>Loading channels...</p>
                ) : channelsError ? (
                  <p className="error-message">Error loading channels: {channelsError.message}</p>
                ) : channels.length === 0 ? (
                  <p>No channels found for this guild.</p>
                ) : (
                  <select
                    id="channel-select"
                    value={selectedChannelId}
                    onChange={(e)=> setSelectedChannelId(e.target.value)}
                    className="qft-select"
                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid var(--border-color)', marginTop: '5px' }}
                  >
                    <option value="">Select a channel…</option>
                    {channels.map(channel => (
                      <option key={channel.id} value={channel.id}>
                        # {channel.name} ({channel.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {userGuilds && userGuilds.length > 0 && (
        <div className="admin-tools" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <AutomodModule guildId={selectedGuildId} />
          <CommandToggleModule guildId={selectedGuildId} />
          <WelcomeModule guildId={selectedGuildId} />
          <SettingsModule />
          <ScheduledEmbedsModule />
          <CustomCommandBuilderModule />
          <AutomodRuleTesterModule />
          <ModerationQuickActionsModule />
          <RolePermissionManagerModule />
        </div>
      )}
    </div>
  );
}

export default Settings;
