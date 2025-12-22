// apps/qft-app/src/pages/Shop.jsx
// Client-Facing Commerce Platform - Products, Services, Contracts

import React, { useState, useMemo } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { FaShoppingCart, FaTools, FaFileContract, FaBars } from 'react-icons/fa';

// Import shop components
import ProductsModule from '../components/modules/ProductsModule';
import ServicesModule from '../components/modules/ServicesModule';
import ContractsModule from '../components/modules/ContractsModule';

function Shop() {
  const { isLoadingUser, userStatus } = useUser();
  const [activeSection, setActiveSection] = useState('products');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  const sectionCategories = [
    {
      title: 'Browse',
      sections: [
        { id: 'products', label: 'Products', icon: FaShoppingCart, component: ProductsModule },
        { id: 'services', label: 'Services', icon: FaTools, component: ServicesModule },
        { id: 'contracts', label: 'Contracts', icon: FaFileContract, component: ContractsModule },
      ]
    }
  ];

  const allSections = sectionCategories.flatMap(cat => cat.sections);

  const ActiveComponent = allSections.find(s => s.id === activeSection)?.component;
  
  const breadcrumbItems = useMemo(() => {
    const currentSection = allSections.find(s => s.id === activeSection);
    return [
      { label: 'Shop', path: '/shop' },
      ...(currentSection ? [{ label: currentSection.label, path: null }] : [])
    ];
  }, [activeSection, allSections]);
  
  

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbItems} />
        <div>
          <h1>QFT Shop</h1>
          <p>Browse products, services, and manage your contracts with QFT Ecosystem</p>
        </div>
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>
        
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        {userStatus && (
          <div className="user-contract-badge" style={{ marginTop: '10px' }}>
            <span className="badge-label">Your Plan:</span>
            <span className={`contract-tier ${userStatus.contractTier || 'free'}`}>
              {userStatus.contractTier ? userStatus.contractTier.toUpperCase() : 'FREE'}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Toggle */}
      <button 
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <FaBars />
      </button>
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
                      onClick={() => { setActiveSection(section.id); closeSidebar(); }}
                    >
                      <span className="nav-icon"><IconComponent /></span>
                      <span className="nav-label">{section.label}</span>
                    </button>
                  );
                })}
              </CollapsibleCategory>
            ))}
          </nav>
        </aside>

        <main className="page-content">
          {ActiveComponent && <ActiveComponent user={userStatus} />}
        </main>
      </div>
    </div>
  );
}

export default Shop;
