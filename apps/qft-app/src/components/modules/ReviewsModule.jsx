// ReviewsModule.jsx - Client Testimonials and Ratings
import React from 'react';
import '../modules.css';

export default function ReviewsModule({ user }) {
  return (
    <div className="qft-module qft-card">
      <div className="module-header">
        <h2>Reviews & Testimonials</h2>
        <button className="qft-button primary">Leave a Review</button>
      </div>
      <div className="module-content">
        <p className="empty-state">Reviews and testimonials coming soon...</p>
        <ul style={{ marginTop: '20px', lineHeight: '2' }}>
          <li>⭐ Product and service ratings</li>
          <li>📝 Written testimonials from clients</li>
          <li>🎯 Overall satisfaction metrics</li>
          <li>👍 Verified purchase reviews</li>
          <li>📊 Rating breakdowns and analytics</li>
          <li>📧 Review response system</li>
        </ul>
      </div>
    </div>
  );
}
