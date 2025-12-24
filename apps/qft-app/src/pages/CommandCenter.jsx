// apps/qft-app/src/pages/CommandCenter.jsx
// Staff Operations Hub - Task Management, Team Coordination, Resources

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import Breadcrumbs from '../components/elements/Breadcrumbs'; // Keep for now, will move to Header.jsx
import { isPrivilegedStaff, isStaffMember } from '../utils/clearance.js';
import { FaTasks, FaUsers, FaChartLine, FaCalendar, FaComments, FaFolder, FaBars, FaBriefcase, FaClipboardList, FaHistory, FaUserTie, FaCogs } from 'react-icons/fa';

// Import task components
import TasksModule from '../components/modules/TasksModule';
import TeamManagementModule from '../components/modules/TeamManagementModule';
import ReportsAnalyticsModule from '../components/modules/ReportsAnalyticsModule';
import CalendarEventsModule from '../components/modules/CalendarEventsModule';
import CommunicationsModule from '../components/modules/CommunicationsModule';
import ResourcesModule from '../components/modules/ResourcesModule';
import SystemLogsModule from '../components/modules/SystemLogsModule';

function CommandCenter() {
  const { isLoadingUser, qftRole, roleName, allRoles, userStatus } = useUser();
  const { setHeaderContent } = useHeader();
  const [activeSection, setActiveSection] = useState('tasks');
  

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPrivileged = isPrivilegedStaff(qftRole);
  const isStaff = isStaffMember(roleName, allRoles);

  // Section categories and allSections must be declared before use
  const sectionCategories = [
    {
      title: 'Operations',
      sections: [
        { id: 'tasks', label: 'Tasks & Projects', icon: FaTasks, component: TasksModule, privileged: false },
        { id: 'calendar', label: 'Calendar & Events', icon: FaCalendar, component: CalendarEventsModule, privileged: false },
        { id: 'operations', label: 'Operations Overview', icon: FaBriefcase, component: ReportsAnalyticsModule, privileged: false },
      ]
    },
    {
      title: 'Business Management',
      sections: [
        { id: 'clients', label: 'Client Projects', icon: FaUserTie, component: TasksModule, privileged: true },
        { id: 'assignments', label: 'Staff Assignments', icon: FaClipboardList, component: TasksModule, privileged: true },
        { id: 'automation', label: 'Automation Controls', icon: FaCogs, component: ResourcesModule, privileged: true },
      ]
    },
    {
      title: 'Management',
      sections: [
        { id: 'team', label: 'Team Management', icon: FaUsers, component: TeamManagementModule, privileged: true },
        { id: 'reports', label: 'Reports & Analytics', icon: FaChartLine, component: ReportsAnalyticsModule, privileged: true },
        { id: 'logs', label: 'Staff Activity Logs', icon: FaHistory, component: SystemLogsModule, privileged: true },
      ]
    },
    {
      title: 'Communication',
      sections: [
        { id: 'communications', label: 'Communications', icon: FaComments, component: CommunicationsModule, privileged: false },
        { id: 'resources', label: 'Resources', icon: FaFolder, component: ResourcesModule, privileged: false },
      ]
    }
  ];


  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const breadcrumbItems = useMemo(() => {
    const currentSection = allSections.find(s => s.id === activeSection);
    return [
      { label: 'Command Center', path: '/command-center' },
      ...(currentSection ? [{ label: currentSection.label, path: null }] : [])
    ];
  }, [activeSection, allSections]);

  useEffect(() => {
    setHeaderContent({
      title: 'Command Center',
      subtitle: 'Staff operations hub for task management, team coordination, and resources',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
      actions: (
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      ),
    });

    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems, toggleSidebar]);

  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  if (!isStaff) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Command Center</h2>
          <p>Staff access required. This area is for QFT team operations and coordination.</p>
          <p>Contact your administrator if you believe you should have access.</p>
        </div>
      </div>
    );
  }

  const allSections = sectionCategories.flatMap(cat => cat.sections);
  const availableSections = allSections.filter(section => !section.privileged || isPrivileged);
  const ActiveComponent = availableSections.find(s => s.id === activeSection)?.component;
  
  return (
    <div className="page-wrapper">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => closeSidebar()}
      />

      <div className="page-layout">
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {sectionCategories.map((category, idx) => {
              const visibleSections = category.sections.filter(s => !s.privileged || isPrivileged);
              if (visibleSections.length === 0) return null;
              
              return (
                <CollapsibleCategory 
                  key={category.title} 
                  title={category.title}
                  defaultOpen={idx === 0}
                >
                  {visibleSections.map(section => {
                    const IconComponent = section.icon;
                    return (
                      <button
                        key={section.id}
                        className={`sidebar-nav-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => { setActiveSection(section.id); closeSidebar(); }}
                      >
                        <span className="nav-icon"><IconComponent /></span>
                        <span className="nav-label">{section.label}</span>
                      </button>
                    );
                  })}
                </CollapsibleCategory>
              );
            })}
          </nav>
        </aside>

        <main className="page-content">
          {ActiveComponent && <ActiveComponent isPrivileged={isPrivileged} />}
        </main>
      </div>
    </div>
  );
}

export default CommandCenter;
