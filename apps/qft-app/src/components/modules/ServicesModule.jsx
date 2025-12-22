// ServicesModule.jsx - Service Offerings
import React from 'react';
import '../modules.css';

export default function ServicesModule({ user }) {
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Services</h2>
        <button className="qft-button primary">Request Quote</button>
      </div>
      <div className="module-content">
        <p className="empty-state">Service offerings catalog coming soon...</p>
        <ul style={{ marginTop: '20px', lineHeight: '2' }}>
          <li>⏱️ Hourly consulting services</li>
          <li>📄 Project-based engagements</li>
          <li>🚀 Managed services and support plans</li>
          <li>📊 Custom development and integrations</li>
          <li>🎯 Training and workshops</li>
          <li>📞 Schedule consultation appointments</li>
        </ul>
      </div>
    </div>
  );
}
