import React, { useState } from 'react';
import ControlPanelContent from '../components/modules/ControlPanelContent';

function ControlPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ControlPanelContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
  );
}

export default ControlPanel;
