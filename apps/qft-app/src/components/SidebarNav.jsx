import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaCog, FaUsers, FaChartBar, FaBars, FaTimes, FaBell, FaUserCircle, FaComments, FaShoppingCart, FaTachometerAlt, FaTasks, FaChevronDown, FaChevronRight, FaDiscord, FaQuestionCircle, FaInfoCircle, FaEnvelope, FaRegCalendarAlt } from 'react-icons/fa';
import './SidebarNav.css';

function SidebarNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    general: true,
    management: false,
    tools: false,
    support: false,
  });

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <>
      {/* Mobile Toggle Button (hidden on desktop via CSS) */}
      <button className="sidebar-mobile-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar navigation">
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay for mobile sidebar (hidden on desktop via CSS) */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <nav className={`page-sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          {/* Close button for mobile sidebar */}
          <button className="close-sidebar" onClick={toggleSidebar} aria-label="Close sidebar navigation">
            <FaTimes />
          </button>
        </div>
        <div className="sidebar-nav">
          {/* General Section */}
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              onClick={() => toggleSection('general')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('general');
                }
              }}
              role="button"
              tabIndex="0"
              aria-expanded={openSections.general}
              aria-controls="general-section-content"
            >
              General
              {openSections.general ? <FaChevronDown className="section-toggle-icon" /> : <FaChevronRight className="section-toggle-icon" />}
            </div>
            <div id="general-section-content" className={`sidebar-section-content ${openSections.general ? 'is-open' : ''}`}>
                <NavLink to="/dashboard" className="sidebar-nav-item" onClick={toggleSidebar} title="Dashboard">
                  <FaTachometerAlt className="nav-icon" />
                  <span className="nav-label">Dashboard</span>
                </NavLink>
                <NavLink to="/chat" className="sidebar-nav-item" onClick={toggleSidebar} title="Chat">
                  <FaComments className="nav-icon" />
                  <span className="nav-label">Chat</span>
                </NavLink>
                <NavLink to="/notifications" className="sidebar-nav-item" onClick={toggleSidebar} title="Notifications">
                  <FaBell className="nav-icon" />
                  <span className="nav-label">Notifications</span>
                </NavLink>
                <NavLink to="/profile" className="sidebar-nav-item" onClick={toggleSidebar} title="Profile">
                  <FaUserCircle className="nav-icon" />
                  <span className="nav-label">Profile</span>
                </NavLink>
                <NavLink to="/shop" className="sidebar-nav-item" onClick={toggleSidebar} title="Shop">
                  <FaShoppingCart className="nav-icon" />
                  <span className="nav-label">Shop</span>
                </NavLink>
            </div>
          </div>

          {/* Management Section */}
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              onClick={() => toggleSection('management')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('management');
                }
              }}
              role="button"
              tabIndex="0"
              aria-expanded={openSections.management}
              aria-controls="management-section-content"
            >
              Management
              {openSections.management ? <FaChevronDown className="section-toggle-icon" /> : <FaChevronRight className="section-toggle-icon" />}
            </div>
            <div id="management-section-content" className={`sidebar-section-content ${openSections.management ? 'is-open' : ''}`}>
                <NavLink to="/users" className="sidebar-nav-item" onClick={toggleSidebar} title="User Management">
                  <FaUsers className="nav-icon" />
                  <span className="nav-label">Users</span>
                </NavLink>
                <NavLink to="/command-center" className="sidebar-nav-item" onClick={toggleSidebar} title="Command Center">
                  <FaTasks className="nav-icon" />
                  <span className="nav-label">Command Center</span>
                </NavLink>
                <NavLink to="/control-panel" className="sidebar-nav-item" onClick={toggleSidebar} title="Control Panel">
                  <FaCog className="nav-icon" />
                  <span className="nav-label">Control Panel</span>
                </NavLink>
            </div>
          </div>

          {/* Tools Section */}
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              onClick={() => toggleSection('tools')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('tools');
                }
              }}
              role="button"
              tabIndex="0"
              aria-expanded={openSections.tools}
              aria-controls="tools-section-content"
            >
              Tools
              {openSections.tools ? <FaChevronDown className="section-toggle-icon" /> : <FaChevronRight className="section-toggle-icon" />}
            </div>
            <div id="tools-section-content" className={`sidebar-section-content ${openSections.tools ? 'is-open' : ''}`}>
                <NavLink to="/analytics" className="sidebar-nav-item" onClick={toggleSidebar} title="Analytics">
                  <FaChartBar className="nav-icon" />
                  <span className="nav-label">Analytics</span>
                </NavLink>
                <NavLink to="/scheduler" className="sidebar-nav-item" onClick={toggleSidebar} title="Scheduler">
                  <FaRegCalendarAlt className="nav-icon" />
                  <span className="nav-label">Scheduler</span>
                </NavLink>
            </div>
          </div>

          {/* Support Section */}
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              onClick={() => toggleSection('support')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('support');
                }
              }}
              role="button"
              tabIndex="0"
              aria-expanded={openSections.support}
              aria-controls="support-section-content"
            >
              Support
              {openSections.support ? <FaChevronDown className="section-toggle-icon" /> : <FaChevronRight className="section-toggle-icon" />}
            </div>
            <div id="support-section-content" className={`sidebar-section-content ${openSections.support ? 'is-open' : ''}`}>
                <NavLink to="/discord" className="sidebar-nav-item" onClick={toggleSidebar} title="Discord Support">
                  <FaDiscord className="nav-icon" />
                  <span className="nav-label">Discord</span>
                </NavLink>
                <NavLink to="/faq" className="sidebar-nav-item" onClick={toggleSidebar} title="Frequently Asked Questions">
                  <FaQuestionCircle className="nav-icon" />
                  <span className="nav-label">FAQ</span>
                </NavLink>
                <NavLink to="/about" className="sidebar-nav-item" onClick={toggleSidebar} title="About QFT">
                  <FaInfoCircle className="nav-icon" />
                  <span className="nav-label">About</span>
                </NavLink>
                <NavLink to="/contact" className="sidebar-nav-item" onClick={toggleSidebar} title="Contact Us">
                  <FaEnvelope className="nav-icon" />
                  <span className="nav-label">Contact</span>
                </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default SidebarNav;
