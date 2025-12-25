import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import './SidebarNav.css';

function SidebarNav({ sidebarOpen, onCloseSidebar }) {
  const { smartNavContent } = useSmartNav();

  return (
    <nav className={`page-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <button className="close-sidebar" onClick={onCloseSidebar} aria-label="Close sidebar navigation">
          <FaTimes />
        </button>
      </div>
      <div className="sidebar-nav">
        {smartNavContent}
      </div>
    </nav>
  );
}

export default SidebarNav;
