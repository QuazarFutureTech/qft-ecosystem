// ResourcesModule.jsx - Documents, SOPs, Knowledge Base
import React from 'react';
import '../modules.css';

export default function ResourcesModule({ isPrivileged }) {
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Resources</h2>
        {isPrivileged && <button className="qft-button primary">+ Upload Resource</button>}
      </div>
      <div className="module-content">
        <p className="empty-state">Document library and knowledge base coming soon...</p>
        <ul style={{ marginTop: '20px', lineHeight: '2' }}>
          <li>📚 Standard Operating Procedures (SOPs)</li>
          <li>📖 Training materials and guides</li>
          <li>📄 Templates and forms</li>
          <li>💡 Knowledge base articles</li>
          <li>🔗 Important links and bookmarks</li>
          <li>🔍 Search across all resources</li>
        </ul>
      </div>
    </div>
  );
}
