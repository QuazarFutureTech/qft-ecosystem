import React from 'react';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import { FaShoppingCart, FaTools, FaFileContract } from 'react-icons/fa';

const sectionCategories = [
  {
    title: 'Browse',
    sections: [
      { id: 'products', label: 'Products', icon: FaShoppingCart },
      { id: 'services', label: 'Services', icon: FaTools },
      { id: 'contracts', label: 'Contracts', icon: FaFileContract },
    ]
  }
];

function ShopSmartNav({ activeSection, onSectionClick, onClose }) {
  return (
    <nav className="sidebar-nav">
      {sectionCategories.map((category, idx) => (
        <CollapsibleCategory 
          key={category.title} 
          title={category.title}
          defaultOpen={true}
        >
          {category.sections.map(section => {
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
      ))}
    </nav>
  );
}

export default ShopSmartNav;
