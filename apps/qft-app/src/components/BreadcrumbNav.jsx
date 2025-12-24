import React from 'react';
import './BreadcrumbNav.css'; // Import the new CSS file

function BreadcrumbNav() {
  return (
    <nav className="breadcrumb-nav" aria-label="breadcrumb">
      <a href="#" className="breadcrumb-nav-item">Home</a>
      <span className="breadcrumb-separator">/</span>
      <a href="#" className="breadcrumb-nav-item">Dashboard</a>
      <span className="breadcrumb-separator">/</span>
      <span className="breadcrumb-nav-item active" aria-current="page">Current Page</span>
    </nav>
  );
}

export default BreadcrumbNav;
