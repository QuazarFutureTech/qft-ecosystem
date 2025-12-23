import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaShieldAlt, FaRobot, FaBrain } from 'react-icons/fa';
import '../../Layout.css';

const modules = [
  {
    id: 'users',
    label: 'User Management',
    description: 'Manage users, roles, and moderation.',
    icon: FaUsers,
    path: '/control-panel/users'
  },
  {
    id: 'permissions',
    label: 'Permissions',
    description: 'Configure staff and user permissions.',
    icon: FaShieldAlt,
    path: '/control-panel/permissions'
  },
  {
    id: 'bot-management',
    label: 'Bot Management',
    description: 'Configure Discord bot features and automation.',
    icon: FaRobot,
    path: '/bot-management'
  },
  {
    id: 'ai-modules',
    label: 'AI Modules',
    description: 'Manage platform AI integrations.',
    icon: FaBrain,
    path: '/control-panel/ai-modules'
  }
  // Add more modules as needed
];

function ControlPanelModulesGrid() {
  const navigate = useNavigate();
  return (
    <div className="page-content">
      <h2>Control Panel Modules</h2>
      <div className="modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {modules.map(module => {
          const Icon = module.icon;
          return (
            <div key={module.id} className="qft-card module-card" style={{ cursor: 'pointer' }} onClick={() => navigate(module.path)}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}><Icon /></div>
              <h3>{module.label}</h3>
              <p>{module.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ControlPanelModulesGrid;
