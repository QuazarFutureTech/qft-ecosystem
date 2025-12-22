// RegistryModule.jsx - Key-Value Registry Manager
import React, { useState, useEffect } from 'react';
import { FaDatabase, FaPlus, FaEdit, FaTrash, FaSearch, FaServer, FaHashtag, FaUserAlt, FaShieldAlt } from 'react-icons/fa';
import { getRegistryEntries, createRegistryEntry, updateRegistryEntry, deleteRegistryEntry } from '../../services/users';
import { useUser } from '../../contexts/UserContext.jsx';
import './RegistryModule.css';
import { useModalLock } from '../../hooks/useModalLock.js';

function RegistryModule() {
  const { userStatus } = useUser();
  const token = localStorage.getItem('qft-token');
  
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    type: 'channel',
    key: '',
    value: '',
    description: ''
  });

  useModalLock(showAddModal);

  const types = [
    { value: 'channel', label: 'Channel', icon: FaHashtag },
    { value: 'role', label: 'Role', icon: FaShieldAlt },
    { value: 'user', label: 'User', icon: FaUserAlt },
    { value: 'server', label: 'Server', icon: FaServer },
    { value: 'custom', label: 'Custom', icon: FaDatabase }
  ];

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, selectedType, searchTerm]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await getRegistryEntries(null, token);
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load registry entries:', error);
      alert('Failed to load registry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(e => e.type === selectedType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredEntries(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.key || !formData.value) {
      alert('Key and value are required');
      return;
    }
    
    try {
      if (editingEntry) {
        await updateRegistryEntry(editingEntry.id, formData, token);
      } else {
        await createRegistryEntry(formData, token);
      }
      
      await loadEntries();
      handleCloseModal();
      alert(editingEntry ? 'Registry entry updated!' : 'Registry entry created!');
    } catch (error) {
      console.error('Failed to save registry entry:', error);
      alert('Failed to save: ' + error.message);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      type: entry.type,
      key: entry.key,
      value: entry.value,
      description: entry.description || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Are you sure you want to delete "${entry.key}"?`)) {
      return;
    }
    
    try {
      await deleteRegistryEntry(entry.id, token);
      await loadEntries();
      alert('Registry entry deleted!');
    } catch (error) {
      console.error('Failed to delete registry entry:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
    setFormData({ type: 'channel', key: '', value: '', description: '' });
  };

  const getTypeIcon = (type) => {
    const typeConfig = types.find(t => t.value === type);
    if (typeConfig) {
      const Icon = typeConfig.icon;
      return <Icon />;
    }
    return <FaDatabase />;
  };

  const groupByType = () => {
    const grouped = {};
    filteredEntries.forEach(entry => {
      if (!grouped[entry.type]) {
        grouped[entry.type] = [];
      }
      grouped[entry.type].push(entry);
    });
    return grouped;
  };

  if (loading) {
    return <div className="registry-loading">Loading registry...</div>;
  }

  return (
    <div className="registry-module">
      <div className="registry-header">
        <div>
          <h2><FaDatabase /> Key-Value Registry</h2>
          <p>Manage channels, roles, users, servers, and custom values for use in commands</p>
        </div>
        <button className="qft-button primary" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Add Entry
        </button>
      </div>

      <div className="registry-filters">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search registry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="type-filters">
          <button
            className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedType('all')}
          >
            All ({entries.length})
          </button>
          {types.map(type => (
            <button
              key={type.value}
              className={`filter-btn ${selectedType === type.value ? 'active' : ''}`}
              onClick={() => setSelectedType(type.value)}
            >
              <type.icon /> {type.label} ({entries.filter(e => e.type === type.value).length})
            </button>
          ))}
        </div>
      </div>

      <div className="registry-content">
        {filteredEntries.length > 0 ? (
          Object.entries(groupByType()).map(([type, typeEntries]) => (
            <div key={type} className="registry-type-section">
              <h3 className="type-header">
                {getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}s
              </h3>
              <div className="registry-list">
                {typeEntries.map(entry => (
                  <div key={entry.id} className="registry-entry">
                    <div className="entry-main">
                      <div className="entry-icon">{getTypeIcon(entry.type)}</div>
                      <div className="entry-details">
                        <div className="entry-key">{entry.key}</div>
                        <div className="entry-value">{entry.value}</div>
                        {entry.description && (
                          <div className="entry-description">{entry.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="entry-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(entry)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(entry)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-entries">
            <FaDatabase size={64} opacity={0.3} />
            <p>No registry entries found</p>
            <p>Click "Add Entry" to create your first registry item</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay open" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEntry ? 'Edit Registry Entry' : 'Add Registry Entry'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="registry-form">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  {types.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Key *</label>
                <input
                  type="text"
                  placeholder="e.g., main-channel, admin-role, bot-user"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  required
                />
                <small>Unique identifier for this entry</small>
              </div>

              <div className="form-group">
                <label>Value *</label>
                <input
                  type="text"
                  placeholder="e.g., 123456789012345678 (Discord ID)"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
                <small>The actual value (usually a Discord ID)</small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Optional description of what this entry is used for"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="qft-button secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="qft-button primary">
                  {editingEntry ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistryModule;
