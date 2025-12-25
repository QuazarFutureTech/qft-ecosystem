import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import ShopSmartNav from './ShopSmartNav.jsx';

// Import shop components
import ProductsModule from '../components/modules/ProductsModule';
import ServicesModule from '../components/modules/ServicesModule';
import ContractsModule from '../components/modules/ContractsModule';

const sectionCategories = [
  {
    title: 'Browse',
    sections: [
      { id: 'products', label: 'Products', component: ProductsModule },
      { id: 'services', label: 'Services', component: ServicesModule },
      { id: 'contracts', label: 'Contracts', component: ContractsModule },
    ]
  }
];

const allSections = sectionCategories.flatMap(cat => cat.sections);

function Shop() {
  const { isLoadingUser, userStatus } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();
  const [activeSection, setActiveSection] = useState('products');

  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  const ActiveComponent = allSections.find(s => s.id === activeSection)?.component;
  
  const breadcrumbItems = useMemo(() => {
    const currentSection = allSections.find(s => s.id === activeSection);
    return [
      { label: 'Shop', path: '/shop' },
      ...(currentSection ? [{ label: currentSection.label, path: null }] : [])
    ];
  }, [activeSection]);

  useEffect(() => {
    setHeaderContent({
      title: 'QFT Shop',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
    });

    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems]);

  useEffect(() => {
    setSmartNavContent(
      <ShopSmartNav 
        activeSection={activeSection}
        onSectionClick={setActiveSection}
        onClose={closeSmartNav}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, activeSection, closeSmartNav]);
  
  return (
    <>
      {ActiveComponent && <ActiveComponent user={userStatus} />}
    </>
  );
}

export default Shop;
