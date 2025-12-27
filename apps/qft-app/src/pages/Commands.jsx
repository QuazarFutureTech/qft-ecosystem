import React, { useState, useEffect } from 'react';
import { FaCode } from 'react-icons/fa';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader

function Commands() {
  const [commands, setCommands] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTriggerType, setFilterTriggerType] = useState('all');
  const [selectedGuild, setSelectedGuild] = useState('');
  const { setHeaderContent } = useHeader(); // Use setHeaderContent

  useEffect(() => {
    fetchCommands();
  }, [selectedGuild]);

  useEffect(() => {
    applyFilters();
  }, [commands, searchTerm, filterTriggerType]);

  // Set header content
  useEffect(() => {
    setHeaderContent({
      title: (<h1><FaCode /> Custom Commands</h1>),
      subtitle: 'View and manage all custom commands for your guild',
    });

    return () => setHeaderContent(null);
  }, [setHeaderContent]);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
//...
  const fetchCommands = async () => {
    if (!selectedGuild) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/guilds/${selectedGuild}/commands`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch commands');
      
      const data = await response.json();
      setCommands(data.commands || []);
    } catch (error) {
      console.error('Error fetching commands:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...commands];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cmd =>
        cmd.command_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Trigger type filter
    if (filterTriggerType !== 'all') {
      filtered = filtered.filter(cmd => cmd.trigger_type === filterTriggerType);
    }

    setFilteredCommands(filtered);
  };

  const handleDelete = async (commandId) => {
    if (!confirm('Are you sure you want to delete this command?')) return;

    try {
      const response = await fetch(`${API_URL}/api/commands/${commandId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete command');

      // Refresh list
      fetchCommands();
    } catch (error) {
      console.error('Error deleting command:', error);
      alert('Failed to delete command');
    }
  };

  const handleToggleEnabled = async (command) => {
    try {
      const response = await fetch(`${API_URL}/api/commands/${command.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          ...command,
          enabled: !command.enabled
        })
      });

      if (!response.ok) throw new Error('Failed to update command');

      fetchCommands();
    } catch (error) {
      console.error('Error updating command:', error);
      alert('Failed to update command');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-layout no-sidebar">
        <main className="page-content no-sidebar">
          <div className="commands-filters">
        <input
          type="text"
          placeholder="Search commands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterTriggerType}
          onChange={(e) => setFilterTriggerType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Triggers</option>
          <option value="slash">Slash Commands</option>
          <option value="message">Message Triggers</option>
          <option value="reaction">Reactions</option>
          <option value="none">No Trigger</option>
        </select>

        <input
          type="text"
          placeholder="Guild ID..."
          value={selectedGuild}
          onChange={(e) => setSelectedGuild(e.target.value)}
          className="guild-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading commands...</div>
      ) : (
        <div className="commands-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Trigger Type</th>
                <th>Enabled</th>
                <th>Executions</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommands.map(cmd => (
                <tr key={cmd.id}>
                  <td className="cmd-name">{cmd.command_name}</td>
                  <td className="cmd-description">{cmd.description || '—'}</td>
                  <td>
                    <span className={`badge badge-${cmd.trigger_type}`}>
                      {cmd.trigger_type}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${cmd.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => handleToggleEnabled(cmd)}
                    >
                      {cmd.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </td>
                  <td>{cmd.execution_count || 0}</td>
                  <td>
                    {cmd.last_executed_at
                      ? new Date(cmd.last_executed_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => window.location.href = `/commands/${cmd.id}/edit`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(cmd.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCommands.length === 0 && (
            <div className="no-commands">
              {selectedGuild
                ? 'No commands found for this guild.'
                : 'Enter a Guild ID to view commands.'}
            </div>
          )}
        </div>
      )}
        </main>
      </div>
    </div>
  );
}

export default Commands;

