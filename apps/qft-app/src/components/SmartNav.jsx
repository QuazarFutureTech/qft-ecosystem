import React from 'react';
import { useSmartNav } from '../contexts/SmartNavContext';
import './SmartNav.css';

function SmartNav() {
  const { smartNavContent } = useSmartNav();

  return (
    <aside className="smart-nav">
      {smartNavContent}
    </aside>
  );
}

export default SmartNav;
