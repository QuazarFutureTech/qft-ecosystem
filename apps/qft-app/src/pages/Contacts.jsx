import React, { useState } from 'react';
import './Contacts.css'; // Assuming you'll create this for styling
import { useModal } from '../hooks/useModal';
import ConfirmModal from '../components/elements/ConfirmModal';

// Mock data for connected users/staff
const mockContacts = [
  { id: '1', name: 'Alice Smith', status: 'Online', role: 'Admin', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'Bob Johnson', status: 'Offline', role: 'Moderator', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'Charlie Brown', status: 'Online', role: 'Member', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'Diana Prince', status: 'Away', role: 'Member', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: '5', name: 'Eve Adams', status: 'Online', role: 'Guest', avatar: 'https://i.pravatar.cc/150?img=5' },
];

function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const availableRoles = ['All', ...new Set(mockContacts.map(contact => contact.role))];

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || contact.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-content contacts-page">
      <h1>Connected Users & Staff</h1>

      {/* Search and Filter UI */}
      <div className="qft-card search-filter-container" style={{ marginBottom: '20px', padding: '15px' }}>
        <h2>Find Contacts</h2>
        <div className="search-input-group" style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search by name..."
            className="qft-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }}
          />
        </div>
        <div className="filter-dropdown-group">
          <label htmlFor="role-filter" className="qft-label" style={{ marginRight: '10px' }}>Filter by Role:</label>
          <select
            id="role-filter"
            className="qft-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid var(--border-color)' }}
          >
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts List */}
      <div className="contacts-list-container">
        {filteredContacts.length === 0 ? (
          <div className="qft-card">No contacts found matching your criteria.</div>
        ) : (
          <div className="contact-grid">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="qft-card contact-card" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', padding: '15px' }}>
                <img src={contact.avatar} alt={`${contact.name}'s avatar`} className="contact-avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '15px' }} />
                <div className="contact-info" style={{ flexGrow: '1' }}>
                  <h3>{contact.name}</h3>
                  <p>Status: <span className={`status-${contact.status.toLowerCase()}`}>{contact.status}</span></p>
                  <p>Role: {contact.role}</p>
                </div>
                <div className="contact-actions">
                  {/* Placeholder for future messaging feature */}
                  <button className="qft-button" style={{ marginRight: '10px' }} onClick={() => showAlert(`Messaging ${contact.name}`)}>
                    Message
                  </button>
                  {/* Placeholder for future role assignment feature */}
                  <button className="qft-button" onClick={() => showAlert(`Assign role to ${contact.name}`)}>
                    Assign Role
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Future Expansion Notes */}
      <div className="qft-card" style={{ marginTop: '30px', padding: '15px' }}>
        <h2>Future Enhancements:</h2>
        <ul>
          <li><strong>Real-time Status:</strong> Integrate with Discord API or other platforms for live user status updates.</li>
          <li><strong>Direct Messaging:</strong> Implement a direct messaging system within the app or link to external platforms.</li>
          <li><strong>Role Management:</strong> Enhance role assignment with dynamic permissions and hierarchy management.</li>
          <li><strong>Pagination/Infinite Scroll:</strong> For a large number of contacts, implement efficient loading.</li>
          <li><strong>Detailed Contact Profiles:</strong> Clickable cards leading to more detailed contact information.</li>
        </ul>
      </div>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}

export default Contacts;
