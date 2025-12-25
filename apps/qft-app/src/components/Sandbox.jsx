import React, { useState, useEffect } from 'react';
import { FaBars, FaBell, FaChevronUp, FaChevronDown, FaHome, FaRobot, FaCog, FaSun, FaMoon } from 'react-icons/fa';
import qftIcon from '../assets/images/QFT_Icon.png';

// Import new library components
import Button from './library/Button';

// Import mock CSS files for Stage 2
import '../pages/mock_styles/Layout.mock.css';
import '../pages/mock_styles/components-Header.mock.css';
import '../pages/mock_styles/components-SmartNav.mock.css';
import '../pages/mock_styles/pages-Dashboard.mock.css'; // Example of a page-specific mock CSS

// --- Scaffold Components (Static / Mock) ---
// These mimic the structure of real components but use static data for safe styling/testing.

const ScaffoldHeader = ({ isDashboard = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Mock data
  const title = "Sandbox Environment";
  const username = "DevUser";
  const avatarUrl = "https://via.placeholder.com/40";

  return (
    <header className={`user-bar ${!isExpanded ? 'is-collapsed' : ''}`}>
      <div className="user-bar-top-row">
        <div className="user-bar-left">
          {!isDashboard && (
            <button className="header-sidebar-toggle" aria-label="Toggle sidebar">
              <FaBars />
            </button>
          )}
          <div className="app-logo">
            <img src={qftIcon} alt="QFT" className="qft-icon" />
            <span>QFT-Pulse</span>
          </div>
        </div>
        
        <div className="user-bar-center">
          <h1 className="header-title">{title}</h1>
        </div>
        
        <div className="user-bar-right">
          <button className="notification-button" aria-label="View notifications">
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
          <div className="profile-container" role="button" tabIndex={0}>
            <img src={avatarUrl} alt={username} className="avatar-small" />
            <span className="username-label">{username}</span>
          </div>
          {!isDashboard && (
            <button className="header-collapse-toggle" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          )}
        </div>
      </div>
      
      {!isDashboard && (
        <div className="user-bar-bottom-row">
          <span>Home / Sandbox / UI Test</span>
        </div>
      )}
    </header>
  );
};

const ScaffoldSmartNav = () => (
  <nav className="smart-nav">
    <h3>Smart Nav</h3>
    <ul>
      <li><FaHome /> Dashboard</li>
      <li><FaRobot /> AI Modules</li>
      <li><FaCog /> Settings</li>
    </ul>
  </nav>
);

// --- Main Sandbox Page ---

const Sandbox = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="sandbox-container">
      {/* Header Scaffold */}
      <ScaffoldHeader isDashboard={false} />
      
      <div className="sandbox-body">
        {/* Sidebar Scaffold */}
        <ScaffoldSmartNav />
        
        {/* Content Area Scaffold */}
        <main className="sandbox-content">
          <div className="sandbox-card">
            <h2>Sandbox Content Area</h2>
            <p>This area is isolated from the main application logic.</p>
            <p>Use this space to test:</p>
            <ul>
              <li>CSS Grid Layouts</li>
              <li>Component Responsiveness</li>
              <li>Theme Colors</li>
              <li>Reusable Components from Library</li>
            </ul>

            <div style={{ marginTop: 'var(--spacing-xl)' }}>
              <h3>Theme Toggle</h3>
              <Button onClick={toggleTheme} variant="ghost" size="medium">
                {theme === 'light' ? <FaMoon /> : <FaSun />} 
                Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
              </Button>
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)' }}>
              <h3>Button Component Examples</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <Button variant="primary" size="medium">Primary Button</Button>
                <Button variant="secondary" size="medium">Secondary Button</Button>
                <Button variant="accent" size="medium">Accent Button</Button>
                <Button variant="ghost" size="medium">Ghost Button</Button>
                <Button variant="primary" size="small">Small Primary</Button>
                <Button variant="secondary" size="large">Large Secondary</Button>
                <Button variant="primary" disabled>Disabled Button</Button>
                <Button variant="primary" onClick={() => alert('Clicked!')}>Click Me</Button>
                <Button variant="primary"><FaCog /> With Icon</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Sandbox;