import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

const SmartNavContext = createContext();

export function useSmartNav() {
  return useContext(SmartNavContext);
}

export function SmartNavProvider({ children }) {
  const [smartNavContent, setSmartNavContent] = useState(null);
  const [isSmartNavOpen, setIsSmartNavOpen] = useState(false);

  const toggleSmartNav = useCallback(() => setIsSmartNavOpen(prev => !prev), []);
  const closeSmartNav = useCallback(() => setIsSmartNavOpen(false), []);

  const value = useMemo(() => ({
    smartNavContent,
    setSmartNavContent,
    isSmartNavOpen,
    toggleSmartNav,
    closeSmartNav,
  }), [smartNavContent, isSmartNavOpen, toggleSmartNav, closeSmartNav]);

  return (
    <SmartNavContext.Provider value={value}>
      {children}
    </SmartNavContext.Provider>
  );
}
