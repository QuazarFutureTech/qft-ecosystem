import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useSelectedGuild } from './SelectedGuildContext.jsx';
import { fetchModuleSettings } from '../services/moduleSettings';

const GuildModuleSettingsContext = createContext(null);

export function GuildModuleSettingsProvider({ children }) {
  const { selectedGuildId } = useSelectedGuild();
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = useMemo(() => localStorage.getItem('qft-token'), []);

  const refresh = useCallback(async () => {
    if (!selectedGuildId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchModuleSettings(selectedGuildId, token);
      setModules(data.modules || {});
    } catch (err) {
      console.error('[GuildModuleSettings] failed to load', err);
      setError(err.message || 'Failed to load module settings');
    } finally {
      setLoading(false);
    }
  }, [selectedGuildId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = useCallback((name) => {
    // default enabled when undefined
    return modules[name] !== false;
  }, [modules]);

  const value = useMemo(() => ({ modules, loading, error, refresh, isEnabled }), [modules, loading, error, refresh, isEnabled]);

  return (
    <GuildModuleSettingsContext.Provider value={value}>
      {children}
    </GuildModuleSettingsContext.Provider>
  );
}

export function useGuildModuleSettings() {
  const ctx = useContext(GuildModuleSettingsContext);
  if (!ctx) throw new Error('useGuildModuleSettings must be used within GuildModuleSettingsProvider');
  return ctx;
}
