import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaShieldAlt, FaDatabase, FaClipboardList, FaBrain } from 'react-icons/fa';
import '../../Layout.css';

const modules = [
  {
    id: 'users',
    label: 'User Management',
    description: 'Manage users, roles, and assignments.',
    icon: FaUsers,
    path: '/control-panel/users'
  },
  {
    id: 'permissions',
    label: 'Permissions',
    description: 'Configure staff permissions.',
    icon: FaShieldAlt,
    path: '/control-panel/permissions'
  },
  {
    id: 'registry',
    label: 'Registry',
    description: 'Manage registry entries and metadata.',
    icon: FaDatabase,
    path: '/control-panel/registry'
  },
  {
    id: 'database',
    label: 'Database Manager',
    description: 'Manage data storage and connections.',
    icon: FaDatabase,
    path: '/control-panel/database'
  },
  {
    id: 'logs',
    label: 'System Logs',
    description: 'View and audit system activity.',
    icon: FaClipboardList,
    path: '/control-panel/logs'
  },
  {
    id: 'ai-modules',
    label: 'AI Modules',
    description: 'Manage AI integrations.',
    icon: FaBrain,
    path: '/control-panel/ai-modules'
  }
];

function ControlPanelModulesGrid() {
  const navigate = useNavigate();
  
  return (
    <div className="page-content">
      <h2>Control Panel</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>
        {modules.map(module => {
          const Icon = module.icon;
          return (
            <div
              key={module.id}
              className="qft-card"
              onClick={() => navigate(module.path)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '8px', color: 'var(--accent-primary)' }}>
                <Icon />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>{module.label}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                {module.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ControlPanelModulesGrid;
