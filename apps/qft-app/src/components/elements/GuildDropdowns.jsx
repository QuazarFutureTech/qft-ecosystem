// Reusable dropdown components for guild data
import React, { useState, useEffect, useRef } from 'react';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext';
import { fetchGuildChannels, fetchGuildRoles, fetchGuildMembers } from '../../services/discord';
import './Dropdown.css';

export function ChannelSelector({ value, onChange, filter, label = "Select Channel", placeholder = "Select channels...", multiple = false }) {
  const { selectedGuildId } = useSelectedGuild();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const token = localStorage.getItem('qft-token');

  useEffect(() => {
    if (selectedGuildId) {
      loadChannels();
    }
  }, [selectedGuildId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChannels = async () => {
    console.log('[ChannelSelector] Loading channels for guild:', selectedGuildId);
    setLoading(true);
    const result = await fetchGuildChannels(selectedGuildId, token);
    console.log('[ChannelSelector] Fetch result:', result);
    setLoading(false);
    if (result.success) {
      let filteredChannels = result.channels;
      if (filter) {
        filteredChannels = filteredChannels.filter(filter);
      }
      console.log('[ChannelSelector] Setting channels:', filteredChannels);
      setChannels(filteredChannels);
    } else {
      console.error('[ChannelSelector] Failed to load channels:', result.error);
    }
  };

  const selectedChannels = multiple ? (value || []) : (value ? [value] : []);
  const selectedNames = channels
    .filter(c => selectedChannels.includes(c.id))
    .map(c => `#${c.name}`)
    .join(', ');

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (channelId) => {
    if (multiple) {
      const newValue = selectedChannels.includes(channelId)
        ? selectedChannels.filter(id => id !== channelId)
        : [...selectedChannels, channelId];
      onChange(newValue);
    } else {
      onChange(channelId);
      setIsOpen(false);
    }
  };

  return (
    <div className="dropdown" ref={dropdownRef} style={{ width: '100%' }}>
      <div 
        className="dropdown-trigger qft-input" 
        onClick={() => !loading && setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Loading...' : selectedNames || placeholder}
        </span>
        <span style={{ marginLeft: '8px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className="dropdown-menu" style={{ width: '100%', maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="qft-input"
              style={{ width: '100%', padding: '6px' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredChannels.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>No channels found</div>
          ) : (
            filteredChannels.map(channel => (
              <div
                key={channel.id}
                onClick={() => handleToggle(channel.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  backgroundColor: selectedChannels.includes(channel.id) ? 'var(--primary-color)' : 'transparent',
                  color: selectedChannels.includes(channel.id) ? 'white' : 'var(--text-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  overflowX: 'hidden'
                }}
                className="dropdown-item"
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{channel.name}</span>
                <span style={{ fontSize: '0.85em', opacity: 0.7, marginLeft: '8px', flexShrink: 0 }}>{channel.typeLabel}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function RoleSelector({ value, onChange, multiple, label = "Select Role", placeholder = "Select roles..." }) {
  const { selectedGuildId } = useSelectedGuild();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const token = localStorage.getItem('qft-token');

  useEffect(() => {
    if (selectedGuildId) {
      loadRoles();
    }
  }, [selectedGuildId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRoles = async () => {
    console.log('[RoleSelector] Loading roles for guild:', selectedGuildId);
    setLoading(true);
    const result = await fetchGuildRoles(selectedGuildId, token);
    console.log('[RoleSelector] Fetch result:', result);
    setLoading(false);
    if (result.success) {
      const filteredRoles = result.roles.filter(r => !r.managed && r.name !== '@everyone');
      console.log('[RoleSelector] Setting roles:', filteredRoles);
      setRoles(filteredRoles);
    } else {
      console.error('[RoleSelector] Failed to load roles:', result.error);
    }
  };

  const selectedRoles = multiple ? (value || []) : (value ? [value] : []);
  const selectedNames = roles
    .filter(r => selectedRoles.includes(r.id))
    .map(r => r.name)
    .join(', ');

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (roleId) => {
    if (multiple) {
      const newValue = selectedRoles.includes(roleId)
        ? selectedRoles.filter(id => id !== roleId)
        : [...selectedRoles, roleId];
      onChange(newValue);
    } else {
      onChange(roleId);
      setIsOpen(false);
    }
  };

  return (
    <div className="dropdown" ref={dropdownRef} style={{ width: '100%' }}>
      <div 
        className="dropdown-trigger qft-input" 
        onClick={() => !loading && setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Loading...' : selectedNames || placeholder}
        </span>
        <span style={{ marginLeft: '8px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className="dropdown-menu" style={{ width: '100%', maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="qft-input"
              style={{ width: '100%', padding: '6px' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredRoles.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>No roles found</div>
          ) : (
            filteredRoles.map(role => (
              <div
                key={role.id}
                onClick={() => handleToggle(role.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  backgroundColor: selectedRoles.includes(role.id) ? 'var(--primary-color)' : 'transparent',
                  color: selectedRoles.includes(role.id) ? 'white' : 'var(--text-color)',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  overflowX: 'hidden'
                }}
                className="dropdown-item"
              >
                <span style={{ 
                  color: role.color !== '#000000' ? role.color : 'inherit',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{role.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function MemberSelector({ value, onChange, label = "Select Member" }) {
  const { selectedGuildId } = useSelectedGuild();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('qft-token');

  useEffect(() => {
    if (selectedGuildId) {
      loadMembers();
    }
  }, [selectedGuildId]);

  const loadMembers = async () => {
    setLoading(true);
    const result = await fetchGuildMembers(selectedGuildId, token, 100);
    setLoading(false);
    if (result.success) {
      setMembers(result.members);
    }
  };

  const filteredMembers = members.filter(m => 
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="member-selector">
      <input 
        type="text" 
        placeholder="Search members..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="qft-input"
      />
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={loading}>
        <option value="">{loading ? 'Loading...' : label}</option>
        {filteredMembers.slice(0, 50).map(member => (
          <option key={member.id} value={member.id}>
            {member.displayName} (@{member.username})
          </option>
        ))}
      </select>
    </div>
  );
}
