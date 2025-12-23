import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaEnvelope, FaCog, FaBars, FaTimes, FaTasks, FaRobot, FaShoppingCart } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext.jsx'; // Import useUser
import { isPrivilegedStaff } from '../utils/clearance.js';
import './Navigation.css';
import ProfileModal from './elements/ProfileModal.jsx';

function Navigation() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { userStatus, qftRole } = useUser(); // Get userStatus and qftRole from context

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);
  const isStaffMember = qftRole !== null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">QFT App</Link>
      </div>
      <div className="navbar-toggle" onClick={toggleNavbar}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </div>
      <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
        <li>
          <NavLink
            to="/"
            onClick={toggleNavbar}
            className={({ isActive }) => (isActive ? 'active-link' : undefined)}
          >
            <FaTachometerAlt /> Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/chat"
            onClick={toggleNavbar}
            className={({ isActive }) => (isActive ? 'active-link' : undefined)}
          >
            <FaEnvelope /> Chat
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/shop"
            onClick={toggleNavbar}
            className={({ isActive }) => (isActive ? 'active-link' : undefined)}
          >
            <FaShoppingCart /> Shop
          </NavLink>
        </li>
        {isStaffMember && (<li>
          <NavLink
            to="/command-center"
            onClick={toggleNavbar}
            className={({ isActive }) => (isActive ? 'active-link' : undefined)}
          >
            <FaTasks /> Command Center
          </NavLink>
        </li>)}
        {hasPrivilegedAccess && ( // Conditionally render Control Panel based on privilege
          <li>
            <NavLink
              to="/control-panel"
              onClick={e => {
                e.preventDefault();
                navigate('/control-panel');
                toggleNavbar();
              }}
              className={({ isActive }) => (isActive ? 'active-link' : undefined)}
            >
              <FaCog /> Control Panel
            </NavLink>
          </li>
        )}
        
      </ul>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </nav>
  );
}

export default Navigation;
