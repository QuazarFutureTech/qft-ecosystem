import React, { useState } from 'react';
import './Users.css';

const UserDetailView = ({ user, onBack, onUserUpdate }) => {
  if (!user) {
    return <div>Select a user to see details.</div>;
  }

  return (
    <div className="user-detail-view">
      <div className="qft-card">
        <div className="user-profile-header">
          <img src={user.discord_avatar_url} alt={`${user.discord_username}'s avatar`} className="avatar" />
          <h2>{user.discord_username}</h2>
          <span className="user-id">ID: {user.qft_uuid}</span>
        </div>
      </div>

      <div className="qft-card">
        <h3>Role Management</h3>
        {/* Role management UI will go here */}
      </div>

      <div className="qft-card">
        <h3>Moderation</h3>
        {/* Moderation UI will go here */}
      </div>
    </div>
  );
};

export default UserDetailView;