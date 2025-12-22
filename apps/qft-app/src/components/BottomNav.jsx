// components/BottomNav.jsx
import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FaComments, FaUsers, FaCog, FaTasks, FaShoppingCart, FaHome } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext.jsx';
import { isPrivilegedStaff, isStaffMember } from '../utils/clearance.js';
import './BottomNav.css';

function BottomNav() {
  const { qftRole, roleName, allRoles } = useUser();
  const navRef = useRef(null);

  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);
  const isStaff = isStaffMember(roleName, allRoles);

  useEffect(() => {
    if (navRef.current) {
      const navHeight = navRef.current.offsetHeight;
      document.documentElement.style.setProperty('--bottom-nav-height', `${navHeight}px`);
    }
  }, [navRef.current]);

  return (
    <nav className="bottom-nav fade-in" ref={navRef}>
      <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Home">
        <FaHome />
        <span className="nav-label">Home</span>
      </NavLink>
      
      <NavLink to="/chat" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Chat">
        <FaComments />
        <span className="nav-label">Chat</span>
      </NavLink>
      
      <NavLink to="/shop" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Shop">
        <FaShoppingCart />
        <span className="nav-label">Shop</span>
      </NavLink>
      
      <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Users">
        <FaUsers />
        <span className="nav-label">Users</span>
      </NavLink>
      
      {isStaff && (
        <NavLink to="/command-center" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Command Center">
          <FaTasks />
          <span className="nav-label">Center</span>
        </NavLink>
      )}
      
      {hasPrivilegedAccess && (
        <NavLink to="/control-panel" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} title="Control Panel">
          <FaCog />
          <span className="nav-label">Control</span>
        </NavLink>
      )}
    </nav>
  );
}

export default BottomNav;
