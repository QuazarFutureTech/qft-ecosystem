// apps/qft-app/src/pages/CommandCenter.jsx
// Staff Operations Hub - Task Management, Team Coordination, Resources

import React, { useState, useMemo } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import Breadcrumbs from '../components/elements/Breadcrumbs';
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
  const [activeSection, setActiveSection] = useState('tasks');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isPrivileged = isPrivilegedStaff(qftRole);
  const isStaff = isStaffMember(roleName, allRoles); // Check if user is QFT staff
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

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

  // Define sections with categories
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

  // Flatten for access control and lookup
  const allSections = sectionCategories.flatMap(cat => cat.sections);

  // Filter sections based on privileges
  const availableSections = allSections.filter(section => !section.privileged || isPrivileged);

  const ActiveComponent = availableSections.find(s => s.id === activeSection)?.component;
  
  const breadcrumbItems = useMemo(() => {
    const currentSection = availableSections.find(s => s.id === activeSection);
    return [
      { label: 'Command Center', path: '/command-center' },
      ...(currentSection ? [{ label: currentSection.label, path: null }] : [])
    ];
  }, [activeSection, availableSections]);
  
  

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbItems} />
        <div>
          <h1>Command Center</h1>
          <p>Staff operations hub for task management, team coordination, and resources</p>
        </div>
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {sectionCategories.map((category, idx) => {
              // Filter category sections by privilege
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
