import React from 'react';
import './ModuleCard.css';
import { FaCog } from 'react-icons/fa';

export default function ModuleCard({
  label,
  icon: Icon,
  enabled,
  onToggle,
  onSettings,
  active,
  onClick,
  categoryIcon: CategoryIcon
}) {
  return (
    <div className={`module-card${active ? ' active' : ''}`}>  
      <div className="module-card-header" >
        {CategoryIcon && (
          <span className="module-card-category-icon"><CategoryIcon size={18} style={{ marginRight: 4, color: '#aaa' }} /></span>
        )}
        <span className="module-card-label">{label}</span>
      </div>
      <div className="module-card-actions">
        <span className="settings-btn" onClick={onClick}><Icon size={24} /></span>
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={onToggle} />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
}
