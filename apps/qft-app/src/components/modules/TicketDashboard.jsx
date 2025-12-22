import React, { useState, useEffect } from 'react';
import Table from '../elements/Table';
import Input from '../elements/Input';
import Button from '../elements/Button';
import { ChannelSelector } from '../elements/GuildDropdowns.jsx';
import { fetchTickets, createTicket } from '../../services/tickets';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal';

export default function TicketDashboard(){
  const { selectedGuildId } = useSelectedGuild();
  const [q,setQ] = useState('');
  const [status,setStatus] = useState('');
  const [page,setPage] = useState(1);
  const [data,setData] = useState([]);
  const [meta,setMeta] = useState({page:1,perPage:10,total:0});
  
  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [channelId, setChannelId] = useState('');
  const { showAlert } = useModal();

  useEffect(()=>{ 
    if (selectedGuildId) load(); 
  }, [q,status,page,selectedGuildId]);

  async function load(){
    if (!selectedGuildId) return;
    const res = await fetchTickets({ guildId: selectedGuildId, page, perPage: meta.perPage, q, status: status||null });
    if (res.success){ setData(res.data); setMeta(res.meta); }
  }

  const handleCreate = async () => {
      if (!newTitle || !newDesc || !channelId) return showAlert('All fields required');
      const res = await createTicket(selectedGuildId, { title: newTitle, description: newDesc, ticketChannelId: channelId });
      if (res.success) {
          showAlert('Ticket created!');
          setIsCreating(false);
          setNewTitle(''); setNewDesc('');
          load();
      } else {
          showAlert(res.error || 'Failed to create ticket');
      }
  };

  const cols = [
    { key: 'ticket_number', title: '#' },
    { key: 'title', title: 'Title' },
    { key: 'status', title: 'Status', render: r => <span className={`status ${r.status}`}>{r.status}</span> },
    { key: 'created_at', title: 'Created', render: r => new Date(r.created_at).toLocaleString() }
  ];

  return (
    <div className="qft-card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Tickets</h2>
        <Button variant="primary" onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? 'Cancel' : 'Create Ticket'}
        </Button>
      </div>

      {isCreating && (
          <div className="qft-field" style={{ marginBottom: 20, padding: 15, background: '#2a2a2a', borderRadius: 8 }}>
              <h3>New Ticket</h3>
              <Input label="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <Input label="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <div className="qft-field">
                <label className="qft-label">Channel (for Thread)</label>
                <ChannelSelector
                  value={channelId}
                  onChange={setChannelId}
                  placeholder="Select channel where thread spawns"
                  filter={(c) => c.type === 0 || c.type === 5} // Text or Announcement channels only
                />
                <small>Select the channel where the ticket thread will be created</small>
              </div>
              <Button onClick={handleCreate} style={{marginTop: 10}}>Submit Ticket</Button>
          </div>
      )}

      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <Input placeholder="Search tickets..." value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} />
        <select aria-label="Filter status" value={status} onChange={e=>{setStatus(e.target.value); setPage(1)}}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="closed">Closed</option>
        </select>
        <Button onClick={()=>{setQ(''); setStatus(''); setPage(1);}}>Reset</Button>
      </div>
      <Table cols={cols} rows={data} caption={`Tickets (page ${meta.page})`} />
      <div style={{display:'flex',justifyContent:'space-between',marginTop:8,alignItems:'center'}}>
        <div>Showing {data.length} / {meta.total}</div>
        <div>
          <Button onClick={()=>setPage(p=>Math.max(1,p-1))} ariaLabel="Previous page">Prev</Button>
          <span style={{margin:'0 8px'}}>Page {meta.page}</span>
          <Button onClick={()=>setPage(p=>p+1)} ariaLabel="Next page">Next</Button>
        </div>
      </div>
    </div>
  );
}
