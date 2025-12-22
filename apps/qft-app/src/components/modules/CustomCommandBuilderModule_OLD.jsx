import React, { useState, useEffect } from 'react';
import Button from '../elements/Button';
import Input from '../elements/Input';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { listCustomCommands, saveCustomCommand, deleteCustomCommand } from '../../services/admin';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function CustomCommandBuilderModule() {
  const { selectedGuildId } = useSelectedGuild();
  const [commands, setCommands] = useState({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [commandCode, setCommandCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  useEffect(() => {
    const load = async () => {
      if (!selectedGuildId) return;
      setLoading(true);
      const token = localStorage.getItem('qft-token');
      const res = await listCustomCommands(selectedGuildId, token);
      setLoading(false);
      if (res.success) setCommands(res.data || {});
    };
    load();
  }, [selectedGuildId]);

  const handleCreate = async () => {
    if (!name.trim() || !commandCode.trim()) return showAlert('Name and script required.');
    setSaving(true);
    const token = localStorage.getItem('qft-token');
    const res = await saveCustomCommand(selectedGuildId, name.toLowerCase(), { commandCode, description }, token);
    setSaving(false);
    await showAlert(res.message);
    if (res.success) {
      // Reload commands to get the ID
      const loadRes = await listCustomCommands(selectedGuildId, token);
      if (loadRes.success) setCommands(loadRes.data || {});
      
      setName('');
      setCommandCode('');
      setDescription('');
    }
  };

  const handleDelete = async (cmdId) => {
    const confirmed = await showConfirm(`Delete this command?`);
    if (!confirmed) return;
    const token = localStorage.getItem('qft-token');
    const res = await deleteCustomCommand(selectedGuildId, cmdId, token);
    await showAlert(res.message);
    if (res.success) {
      // Reload
      const loadRes = await listCustomCommands(selectedGuildId, token);
      if (loadRes.success) setCommands(loadRes.data || {});
    }
  };

  const insertTemplate = (type) => {
      if (type === 'simple') {
          setCommandCode('send("Channel", "Hello World!")');
      } else if (type === 'advanced') {
          setCommandCode('var user := get("user")\nif user == "admin" {\n  send("Channel", "Welcome Admin!")\n} else {\n  send("Channel", "Access Denied")\n}');
      }
  };

  return (
    <div className="qft-card">
      <h2>Custom Commands</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="qft-field">
            <Input label="Command Trigger" value={name} onChange={e => setName(e.target.value)} id="cmd-name" placeholder="!mycommand" />
            
            <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} id="cmd-desc" placeholder="What does this command do?" />

            <label className="qft-label">
                Script (Pseudo-Lang) 
                <span style={{fontSize: '0.8em', marginLeft: '10px', color: '#888'}}>
                    <a href="#" onClick={(e) => { e.preventDefault(); insertTemplate('simple'); }}>Simple Template</a> | 
                    <a href="#" onClick={(e) => { e.preventDefault(); insertTemplate('advanced'); }}> Advanced Template</a>
                </span>
            </label>
            <textarea
              value={commandCode}
              onChange={e => setCommandCode(e.target.value)}
              className="qft-input"
              rows={6}
              placeholder='send("Channel", "Hello World!")'
              style={{ fontFamily: 'monospace' }}
            />
            
            <Button onClick={handleCreate} disabled={saving} variant="primary" style={{ marginTop: 10 }}>
              {saving ? 'Saving…' : 'Save Command'}
            </Button>
          </div>

          {Object.keys(commands).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Existing Commands</h3>
              <ul className="guild-list">
                {Object.entries(commands).map(([cmdName, cmd]) => (
                  <li key={cmd.id || cmdName} className="guild-entry" style={{ justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <strong>!{cmdName}</strong>
                      <div style={{ fontSize: '0.85em', color: '#ccc' }}>{cmd.description || 'No description'}</div>
                      <pre style={{ fontSize: '0.75em', background: '#222', padding: '5px', borderRadius: '4px', marginTop: '5px', overflowX: 'auto' }}>
                          {cmd.commandCode}
                      </pre>
                    </div>
                    <Button onClick={() => handleDelete(cmd.id)} variant="secondary">Delete</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
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
