import React from 'react';
import { FaBullhorn, FaComments, FaQuestionCircle, FaHeadset, FaCircle, FaUser, FaTicketAlt } from 'react-icons/fa';
import './ChatSmartNav.css';

function ChatSmartNav({ channels, dms, tickets = [], onlineUsers, activeChannel, onChannelClick, onUserClick }) {

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#43b581';
      case 'idle': return '#faa61a';
      case 'dnd': return '#f04747';
      default: return '#747f8d';
    }
  };

  const getActiveId = (activeChannel) => {
    if (!activeChannel) return null;
    const parts = activeChannel.split(':');
    // For DMs, the ID part can contain multiple parts, so we join them back
    return parts.length > 2 ? parts.slice(1).join(':') : parts[1];
  }

  return (
    <div className="chat-smart-nav">
      <div className="smart-nav-section">
        <h3 className="smart-nav-title">Channels</h3>
        <ul className="smart-nav-list">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                className={`smart-nav-item ${getActiveId(activeChannel) === channel.id ? 'active' : ''}`}
                onClick={() => onChannelClick(`channel:${channel.id}`)}
              >
                <span className="smart-nav-icon">{React.createElement(channel.icon)}</span>
                <span className="smart-nav-label">{channel.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="smart-nav-section">
        <h3 className="smart-nav-title">Direct Messages</h3>
        <ul className="smart-nav-list">
          {dms.map((dm) => (
            <li key={dm.id}>
              <button
                className={`smart-nav-item user-item ${getActiveId(activeChannel) === dm.id ? 'active' : ''}`}
                onClick={() => onChannelClick(`dm:${dm.id}`)}
              >
                <div className="user-avatar-status">
                  <FaCircle
                    className="status-indicator"
                    style={{ color: getStatusColor('online') }} // Placeholder status
                  />
                  <span className="smart-nav-label">{dm.name}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="smart-nav-section">
        <h3 className="smart-nav-title">Support Tickets</h3>
        <ul className="smart-nav-list">
          {tickets.map((ticket, index) => (
            <li key={`${ticket.id}-${index}`}>
              <button
                className={`smart-nav-item ${getActiveId(activeChannel) === ticket.id ? 'active' : ''}`}
                onClick={() => onChannelClick(`ticket:${ticket.id}`)}
              >
                <span className="smart-nav-icon"><FaTicketAlt /></span>
                <span className="smart-nav-label">{`Ticket #${ticket.ticket_number}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="smart-nav-section">
        <h3 className="smart-nav-title">Online—{onlineUsers.length}</h3>
        <ul className="smart-nav-list">
          {onlineUsers.map((user) => (
            <li key={user.qft_uuid}>
              <button className="smart-nav-item user-item" onClick={() => onUserClick(user)}>
                <div className="user-avatar-status">
                  <div className="avatar-placeholder"><FaUser /></div>
                </div>
                <span className="smart-nav-label">{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ChatSmartNav;