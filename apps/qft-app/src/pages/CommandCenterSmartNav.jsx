import React from 'react';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import { FaTasks, FaUsers, FaChartLine, FaCalendar, FaComments, FaFolder, FaBriefcase, FaClipboardList, FaHistory, FaUserTie, FaCogs } from 'react-icons/fa';

function CommandCenterSmartNav({ sectionCategories, activeSection, onSectionClick, isPrivileged, onClose }) {
  return (
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
                  onClick={() => { onSectionClick(section.id); onClose(); }}
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
  );
}

export default CommandCenterSmartNav;
