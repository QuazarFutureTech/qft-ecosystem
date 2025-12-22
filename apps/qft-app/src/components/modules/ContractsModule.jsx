// ContractsModule.jsx - Active Contracts, Templates, Management
import React from 'react';
import '../modules.css';

export default function ContractsModule({ user }) {
  const contractTier = user?.contractTier || 'free';
  
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Contracts & Plans</h2>
        <div className="current-tier" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Your Plan:</span>
          <span className={`contract-badge tier-${contractTier}`}>
            {contractTier.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="module-content">
        <div className="contract-info" style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3>Current Contract Status</h3>
          <p><strong>Tier:</strong> {contractTier.toUpperCase()}</p>
          <p><strong>Status:</strong> Active</p>
          <p><strong>Renewal Date:</strong> January 1, 2026</p>
        </div>
        
        <h3>Available Plans</h3>
        <ul style={{ marginTop: '15px', lineHeight: '2' }}>
          <li>🆓 <strong>Free Tier</strong> - Basic access to ecosystem</li>
          <li>🥉 <strong>Bronze</strong> - Enhanced features + priority support</li>
          <li>🥈 <strong>Silver</strong> - Advanced features + dedicated account manager</li>
          <li>🥇 <strong>Gold</strong> - Premium features + custom integrations</li>
          <li>💎 <strong>Platinum</strong> - Enterprise solutions + SLA guarantees</li>
        </ul>
        
        <button className="qft-button primary" style={{ marginTop: '20px' }}>Upgrade Plan</button>
      </div>
    </div>
  );
}
