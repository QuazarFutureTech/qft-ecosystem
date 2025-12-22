// ProductsModule.jsx - Physical/Digital Goods Catalog
import React from 'react';
import '../modules.css';

export default function ProductsModule({ user }) {
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Products Catalog</h2>
        <input type="text" placeholder="Search products..." className="search-input" style={{ maxWidth: '300px' }} />
      </div>
      <div className="module-content">
        <p className="empty-state">Product catalog coming soon...</p>
        <ul style={{ marginTop: '20px', lineHeight: '2' }}>
          <li>💻 Digital products and downloads</li>
          <li>📦 Physical goods and merchandise</li>
          <li>🎯 Featured and promotional items</li>
          <li>💰 Pricing and bulk discounts</li>
          <li>⭐ Product ratings and reviews</li>
          <li>📦 Inventory and availability status</li>
        </ul>
      </div>
    </div>
  );
}
