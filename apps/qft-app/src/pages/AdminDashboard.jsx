import React from 'react';
import AdminDashboardContent from '../components/modules/AdminDashboardContent'; // Import the renamed component

function AdminDashboard() {
  return (
    <div className="page-content">
      {/* AdminDashboardContent now contains all the modules */}
      <AdminDashboardContent />
    </div>
  );
}

export default AdminDashboard;
