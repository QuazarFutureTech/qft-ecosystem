import React, { useState } from 'react';
import Input from '../elements/Input';
import Button from '../elements/Button';
import Modal from '../elements/Modal';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { postEmbed } from '../../services/discord';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function EmbedBuilderModule(){
  const [title,setTitle] = useState('');
  const [desc,setDesc] = useState('');
  const [color,setColor] = useState('#2f3136');
  const [previewOpen,setPreviewOpen] = useState(false);
  const [sending,setSending] = useState(false);
  const { selectedGuildId, selectedChannelId } = useSelectedGuild();
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  const handleSend = async () => {
    if (!selectedGuildId) return showAlert('Please select a guild (Settings page).');
    if (!selectedChannelId) return showAlert('Please select a channel (Settings page).');
    setSending(true);
    try {
      const token = localStorage.getItem('qft-token');
      if (!token) throw new Error('Missing auth token.');
      const embed = { title, description: desc, color };
      const res = await postEmbed({ guildId: selectedGuildId, channelId: selectedChannelId, embed }, token);
      await showAlert(res?.message || 'Embed posted');
    } catch (err) {
      await showAlert(`Failed to post embed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="qft-card">
      <h2>Embed Builder</h2>
      <Input label="Title" id="embed-title" value={title} onChange={e=>setTitle(e.target.value)} />
      <div className="qft-field">
        <label className="qft-label">Description</label>
        <textarea aria-label="Embed description" value={desc} onChange={e=>setDesc(e.target.value)} className="qft-input" rows={4}></textarea>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <label className="qft-label">Color</label>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} aria-label="Embed color" />
      </div>
      <div style={{marginTop:10, display:'flex', gap:8}}>
        <Button onClick={()=>setPreviewOpen(true)} variant="secondary">Preview</Button>
        <Button onClick={handleSend} variant="primary">{sending ? 'Posting…' : 'Post Embed'}</Button>
      </div>

      <Modal open={previewOpen} onClose={()=>setPreviewOpen(false)} ariaLabel="Embed preview">
        <div style={{padding:20}}>
          <h3 style={{marginTop:0}}>{title || 'Untitled'}</h3>
          <p>{desc}</p>
          <div style={{height:8,background:color,borderRadius:4}} />
          <div style={{marginTop:16, display:'flex', gap:8}}>
            <Button onClick={()=>setPreviewOpen(false)}>Close</Button>
            <Button onClick={handleSend} variant="primary">{sending ? 'Posting…' : 'Post Embed'}</Button>
          </div>
        </div>
      </Modal>
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
