// CommunicationsModule.jsx - Internal Messaging, Announcements
import React from 'react';
import '../modules.css';

export default function CommunicationsModule({ isPrivileged }) {
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Communications</h2>
        <button className="qft-button primary">+ New Message</button>
      </div>
      <div className="module-content">
        <p className="empty-state">Internal communications hub coming soon...</p>
        <ul style={{ marginTop: '20px', lineHeight: '2' }}>
          <li>💬 Direct messaging between team members</li>
          <li>📢 Team-wide announcements</li>
          <li>📌 Pinned important messages</li>
          <li>🔔 Notification preferences</li>
          <li>📁 File sharing and attachments</li>
          <li>🔍 Message search and history</li>
        </ul>
      </div>
    </div>
  );
}
