import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import CommandCenterSmartNav from './CommandCenterSmartNav.jsx';
import { isPrivilegedStaff, isStaffMember } from '../utils/clearance.js';
import { FaTasks, FaUsers, FaChartLine, FaCalendar, FaComments, FaFolder, FaBriefcase, FaClipboardList, FaHistory, FaUserTie, FaCogs } from 'react-icons/fa';

// Import task components
import TasksModule from '../components/modules/TasksModule';
import TeamManagementModule from '../components/modules/TeamManagementModule';
import ReportsAnalyticsModule from '../components/modules/ReportsAnalyticsModule';
import CalendarEventsModule from '../components/modules/CalendarEventsModule';
import CommunicationsModule from '../components/modules/CommunicationsModule';
import ResourcesModule from '../components/modules/ResourcesModule';
import SystemLogsModule from '../components/modules/SystemLogsModule';

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

const allSections = sectionCategories.flatMap(cat => cat.sections);

function CommandCenter() {
  const { isLoadingUser, qftRole, roleName, allRoles } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();
  const [activeSection, setActiveSection] = useState('tasks');
  
  const isPrivileged = isPrivilegedStaff(qftRole);
  const isStaff = isStaffMember(roleName, allRoles);

  const breadcrumbItems = useMemo(() => {
    const currentSection = allSections.find(s => s.id === activeSection);
    return [
      { label: 'Command Center', path: '/command-center' },
      ...(currentSection ? [{ label: currentSection.label, path: null }] : [])
    ];
  }, [activeSection]);

  useEffect(() => {
    setHeaderContent({
      title: 'Command Center',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
    });
    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems]);

  useEffect(() => {
    setSmartNavContent(
      <CommandCenterSmartNav
        sectionCategories={sectionCategories}
        activeSection={activeSection}
        onSectionClick={setActiveSection}
        isPrivileged={isPrivileged}
        onClose={closeSmartNav}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, activeSection, isPrivileged, closeSmartNav]);


  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  if (!isStaff) {
    return (
      <div className="qft-card">
        <h2>Command Center</h2>
        <p>Staff access required. This area is for QFT team operations and coordination.</p>
        <p>Contact your administrator if you believe you should have access.</p>
      </div>
    );
  }

  const availableSections = allSections.filter(section => !section.privileged || isPrivileged);
  const ActiveComponent = availableSections.find(s => s.id === activeSection)?.component;
  
  return (
    <>
      {ActiveComponent && <ActiveComponent isPrivileged={isPrivileged} />}
    </>
  );
}

export default CommandCenter;
