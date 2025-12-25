import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaComments,
  FaShoppingCart,
  FaBell,
  FaUserCircle,
  FaTasks,
  FaCog
} from 'react-icons/fa';
import { useUser } from '../contexts/UserContext.jsx';
import { isPrivilegedStaff, isStaffMember } from '../utils/clearance.js';
import './TabsNav.css';

function TabsNav() {
  const { qftRole, roleName, allRoles } = useUser();
  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);
  const isStaff = isStaffMember(roleName, allRoles);

  return (
    <nav className="tabs-nav">
      <NavLink to="/dashboard" className="tabs-nav-item" title="Dashboard">
        <FaTachometerAlt />
      </NavLink>
      <NavLink to="/chat" className="tabs-nav-item" title="Chat">
        <FaComments />
      </NavLink>
      <NavLink to="/shop" className="tabs-nav-item" title="Shop">
        <FaShoppingCart />
      </NavLink>
      {isStaff && (
        <NavLink to="/command-center" className="tabs-nav-item" title="Command Center">
          <FaTasks />
        </NavLink>
      )}
      {hasPrivilegedAccess && (
        <NavLink to="/control-panel" className="tabs-nav-item" title="Control Panel">
          <FaCog />
        </NavLink>
      )}
    </nav>
  );
}

export default TabsNav;
