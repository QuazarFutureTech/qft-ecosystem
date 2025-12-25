import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const HeaderContext = createContext();

export const HeaderProvider = ({ children }) => {
  const [headerContent, setHeaderContent] = useState(null); // Or some default value
  const [sidebarOpen, setSidebarOpen] = useState(false); // New state for sidebar
  const [sidebarContent, setSidebarContent] = useState(null); // New state for dynamic sidebar content

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Function to close sidebar, useful for nav items
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const value = useMemo(() => ({
    headerContent,
    setHeaderContent,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    sidebarContent,
    setSidebarContent
  }), [headerContent, sidebarOpen, toggleSidebar, closeSidebar, sidebarContent]);

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  return useContext(HeaderContext);
};