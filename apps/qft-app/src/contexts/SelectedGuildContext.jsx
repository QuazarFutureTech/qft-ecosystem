import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './UserContext.jsx';

const SelectedGuildContext = createContext(null);

export function SelectedGuildProvider({ children }) {
  const { userStatus, userGuilds } = useUser();

  const [selectedGuildId, setSelectedGuildId] = useState(() => {
    const saved = localStorage.getItem('qft-selected-guild-id');
    return saved || '';
  });
  const [selectedChannelId, setSelectedChannelId] = useState(() => {
    const saved = localStorage.getItem('qft-selected-channel-id');
    return saved || '';
  });

  // Initialize default guild when user/guilds load
  useEffect(() => {
    if (!selectedGuildId && userStatus && userGuilds && userGuilds.length > 0) {
      setSelectedGuildId(userGuilds[0].id);
    }
  }, [userStatus, userGuilds, selectedGuildId]);

  // Persist selections
  useEffect(() => {
    if (selectedGuildId) localStorage.setItem('qft-selected-guild-id', selectedGuildId);
  }, [selectedGuildId]);
  useEffect(() => {
    if (selectedChannelId) localStorage.setItem('qft-selected-channel-id', selectedChannelId);
  }, [selectedChannelId]);

  // Reset channel when guild changes
  useEffect(() => {
    setSelectedChannelId('');
  }, [selectedGuildId]);

  const value = useMemo(() => ({
    selectedGuildId,
    setSelectedGuildId,
    selectedChannelId,
    setSelectedChannelId,
  }), [selectedGuildId, selectedChannelId]);

  return (
    <SelectedGuildContext.Provider value={value}>
      {children}
    </SelectedGuildContext.Provider>
  );
}

export function useSelectedGuild() {
  const ctx = useContext(SelectedGuildContext);
  if (!ctx) {
    throw new Error('useSelectedGuild must be used within SelectedGuildProvider');
  }
  return ctx;
}
