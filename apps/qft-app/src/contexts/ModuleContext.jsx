// apps/qft-app/src/contexts/ModuleContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { listModules } from '../services/modules'; // We will create this service function

const ModuleContext = createContext();

export function useModules() {
  return useContext(ModuleContext);
}

export function ModuleProvider({ children }) {
  const [moduleConfig, setModuleConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModuleConfig = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('qft-token');
      if (!token) {
        // No token, not logged in, so no modules to fetch
        setModuleConfig({});
        setLoading(false);
        return;
      }
      
      const config = await listModules(token);
      setModuleConfig(config.pages || {});
      setError(null);
    } catch (err) {
      console.error("Failed to fetch module configuration:", err);
      setError(err);
      setModuleConfig({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModuleConfig();
  }, [fetchModuleConfig]);
  
  const value = {
    moduleConfig,
    loading,
    error,
    refreshModules: fetchModuleConfig,
    setModuleConfig // Allow direct updates from module manager
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}
