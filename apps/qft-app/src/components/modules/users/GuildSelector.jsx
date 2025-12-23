
import React from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useUser } from '../../../contexts/UserContext';
import '../../Navigation.css'; // Reusing some styles

const GuildSelector = ({ onGuildSelect, onBack, sidebarOpen, onCloseSidebar }) => {
  const { userGuilds } = useUser();

  return (
    <div className={`module-list-container sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="module-list-header">
        <button onClick={onBack} className="back-button">
          <FaArrowLeft />
        </button>
        <h2>Select a Server</h2>
        <button className="close-sidebar-button" onClick={onCloseSidebar}>&times;</button>
      </div>
      <ul className="module-list">
        {userGuilds && userGuilds.length > 0 ? (
          userGuilds.map(guild => (
            <li key={guild.id} onClick={() => onGuildSelect(guild.id)}>
              <img src={guild.icon_url} alt={`${guild.name} icon`} className="guild-icon" />
              <span>{guild.name}</span>
            </li>
          ))
        ) : (
          <p>No servers found.</p>
        )}
      </ul>
    </div>
  );
};

export default GuildSelector;
