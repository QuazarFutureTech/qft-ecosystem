import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext.jsx';
import { useModal } from '../../hooks/useModal.jsx';
import ConfirmModal from '../elements/ConfirmModal';
import '../modules.css';

export default function TicketPanel() {
  const { userStatus, qftRole } = useUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('open');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', channelId: '' });
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const token = localStorage.getItem('qft-token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/YOUR_GUILD_ID/tickets?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      showAlert('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!formData.title) {
      showAlert('Please enter a title');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/guilds/YOUR_GUILD_ID/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Ticket created!');
        setFormData({ title: '', description: '', channelId: '' });
        setShowCreateForm(false);
        fetchTickets();
      }
    } catch (error) {
      showAlert('Error creating ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    const confirmed = await showConfirm('Close this ticket?');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        showAlert('Ticket closed');
        fetchTickets();
      }
    } catch (error) {
      showAlert('Error closing ticket');
    }
  };

  return (
    <div className="ticket-panel">
      <h2>Support Tickets</h2>

      <div className="ticket-controls">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter tickets by status">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn primary" onClick={() => setShowCreateForm(!showCreateForm)} aria-label="Toggle create ticket form">
          {showCreateForm ? 'Cancel' : 'Create Ticket'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-ticket-form">
          <input
            type="text"
            placeholder="Ticket Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            aria-label="Ticket title"
          />
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            aria-label="Ticket description"
          />
          <button className="btn primary" onClick={handleCreateTicket}>
            Create
          </button>
        </div>
      )}

      <div className="tickets-list">
        {loading ? (
          <p>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p>No tickets found</p>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <h3>#{ticket.ticket_number}: {ticket.title}</h3>
                <span className={`status status-${ticket.status}`}>{ticket.status}</span>
              </div>
              <p className="ticket-desc">{ticket.description}</p>
              <div className="ticket-meta">
                <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                <span>Messages: {ticket.message_count}</span>
              </div>
              {ticket.status === 'open' && (
                <button className="btn danger" onClick={() => handleCloseTicket(ticket.id)}>
                  Close Ticket
                </button>
              )}
            </div>
          ))
        )}
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
