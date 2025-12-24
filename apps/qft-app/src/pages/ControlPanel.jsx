import React, { useState, useEffect, useCallback } from 'react';
import ControlPanelContent from '../components/modules/ControlPanelContent';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
import { FaBars } from 'react-icons/fa'; // Import FaBars icon

function ControlPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setHeaderContent } = useHeader(); // Get setHeaderContent from context
  const [controlPanelHeaderContent, setControlPanelHeaderContent] = useState(null);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const setHeaderContentForControlPanel = useCallback((content) => {
    setControlPanelHeaderContent(content);
  }, []);

  useEffect(() => {
    if (controlPanelHeaderContent) {
      setHeaderContent({
        ...controlPanelHeaderContent, // Pass content from ControlPanelContent
        actions: ( // Merge actions, ensuring sidebar toggle is always present if it was passed
          <>
            {controlPanelHeaderContent.actions}
            <button 
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>
          </>
        ),
      });
    } else {
      setHeaderContent(null);
    }

    return () => setHeaderContent(null);
  }, [setHeaderContent, controlPanelHeaderContent, toggleSidebar]);

  return (
    <ControlPanelContent 
      sidebarOpen={sidebarOpen} 
      setSidebarOpen={setSidebarOpen}
      setHeaderContentForControlPanel={setHeaderContentForControlPanel}
      toggleSidebar={toggleSidebar} // Pass toggleSidebar down for direct use in ControlPanelContent if needed
    />
  );
}

export default ControlPanel;
