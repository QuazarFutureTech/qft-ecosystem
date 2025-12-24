// apps/qft-app/src/pages/Shop.jsx
// Client-Facing Commerce Platform - Products, Services, Contracts

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
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
  const { setHeaderContent } = useHeader(); // Use setHeaderContent
  const [activeSection, setActiveSection] = useState('products');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

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

  useEffect(() => {
    setHeaderContent({
      title: 'QFT Shop',
      subtitle: 'Browse products, services, and manage your contracts with QFT Ecosystem',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
      actions: (
        <>
          {userStatus && (
            <div className="user-contract-badge" style={{ marginTop: '10px' }}>
              <span className="badge-label">Your Plan:</span>
              <span className={`contract-tier ${userStatus.contractTier || 'free'}`}>
                {userStatus.contractTier ? userStatus.contractTier.toUpperCase() : 'FREE'}
              </span>
            </div>
          )}
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
        </>
      ),
    });

    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems, userStatus, toggleSidebar]);
  
  return (
    <div className="page-wrapper">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => closeSidebar()}
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
