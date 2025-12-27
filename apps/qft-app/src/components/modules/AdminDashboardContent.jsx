// apps/qft-app/src/components/modules/AdminDashboardContent.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { FaShieldAlt, FaUserShield, FaClipboardList, FaDatabase, FaCog, FaNetworkWired, FaChartLine, FaRobot } from 'react-icons/fa';

import { useUser } from '../../contexts/UserContext.jsx';
import { useModules } from '../../contexts/ModuleContext.jsx'; // Import the new context hook

import UserManagementModule from './UserManagementModule';
import PermissionsModule from './PermissionsModule';
import SystemLogsModule from './SystemLogsModule';
import RegistryModule from './RegistryModule';
import ModuleManagerModule from './ModuleManagerModule.jsx';

import '../../Layout.css';
import '../../theme.css';

// Map string names to actual components
const componentMap = {
  UserManagementModule,
  PermissionsModule,
  SystemLogsModule,
  RegistryModule,
  ModuleManagerModule,
  // Add other components here as they are created
};

// Map string names to icons
const iconMap = {
  FaUserShield,
  FaShieldAlt,
  FaClipboardList,
  FaDatabase,
  FaCog,
  FaNetworkWired,
  FaChartLine,
  FaRobot
  // Add other icons here
};

function AdminDashboardContent() {
  const { userStatus } = useUser();
  const { moduleConfig, loading: modulesLoading } = useModules();
  
  // Derives the active sections from the module config, filtered by what's enabled
  const adminSections = useMemo(() => {
    const pageConfig = moduleConfig['control-panel'];
    if (!pageConfig || !pageConfig.categories) return [];
    
    let sections = [];
    pageConfig.categories.forEach(cat => {
      if (cat.enabled) {
        cat.modules.forEach(mod => {
          if (mod.enabled) {
            sections.push({
              id: mod.module_key, // Use module_key for unique ID
              label: mod.name,
              icon: iconMap[mod.icon] || FaCog, // Get icon from map or default
              component: componentMap[mod.component_name] // Get component from map
            });
          }
        });
      }
    });
    return sections;
  }, [moduleConfig]);

  const [activeSection, setActiveSection] = useState(null);

  // Set the default active section once the sections are loaded
  useEffect(() => {
    if (!activeSection && adminSections.length > 0) {
      setActiveSection(adminSections[0].id);
    }
  }, [adminSections, activeSection]);

  const renderActiveSection = () => {
    if (modulesLoading) {
      return <div>Loading modules...</div>;
    }
    const section = adminSections.find(s => s.id === activeSection);
    if (!section || !section.component) {
      return <div>Please select a module from the navigation.</div>;
    }
    const Component = section.component;
    return <Component />;
  };

  return (
    <>
      <div className="bot-management-page">
        <div className="bot-management-header">
          <h1>Admin Control Panel</h1>
          <p>Manage users, system settings, and platform orchestration</p>
        </div>

        <div className="bot-management-layout">
          <aside className="bot-management-sidebar">
            <nav className="bot-modules-nav">
              {modulesLoading ? (
                <p>Loading Nav...</p>
              ) : (
                adminSections.map(section => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      className={`module-nav-item ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="module-icon"><IconComponent /></span>
                      <span className="module-label">{section.label}</span>
                    </button>
                  );
                })
              )}
            </nav>
          </aside>

          <main className="bot-management-content">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </>
  );
}

export default AdminDashboardContent;
