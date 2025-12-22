import React, { useState } from 'react';
import Switch from '../elements/Switch';
import Input from '../elements/Input';
import Button from '../elements/Button';
import { fetchGuildConfig, saveGuildConfig } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function AutomodModule({ guildId: guildIdProp }){
  const { userGuilds } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const guildId = guildIdProp || selectedGuildId || userGuilds?.[0]?.id;
  const [enabled,setEnabled] = useState(true);
  const [spamThreshold,setSpamThreshold] = useState(6);
  const [capsEnabled,setCapsEnabled] = useState(true);
  const [linksEnabled,setLinksEnabled] = useState(true);
  const [loading,setLoading] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  React.useEffect(()=>{ const load = async ()=>{ if (!guildId) return; const token = localStorage.getItem('qft-token'); const res = await fetchGuildConfig(guildId, token); if (res.success && res.data.automod){ const a = res.data.automod; setEnabled(a.enabled ?? true); setSpamThreshold(a.spamThreshold ?? 6); setCapsEnabled(a.caps ?? true); setLinksEnabled(a.links ?? true); } }; load(); }, [guildId]);

  return (
    <div className="qft-card">
      <h2>Automod</h2>
      <div className="setting-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>Enable Automod</div>
        <Switch checked={enabled} onChange={e=>setEnabled(e.target.checked)} ariaLabel="Toggle automod" />
      </div>

      <div style={{marginTop:10}}>
        <label className="qft-label">Spam threshold: {spamThreshold} messages</label>
        <input aria-label="Spam threshold" type="range" min={2} max={20} value={spamThreshold} onChange={e=>setSpamThreshold(Number(e.target.value))} />
      </div>

      <div style={{display:'flex',gap:12,marginTop:10}}>
        <div style={{flex:1}}>Links: <Switch checked={linksEnabled} onChange={e=>setLinksEnabled(e.target.checked)} ariaLabel="Toggle link filter" /></div>
        <div style={{flex:1}}>Caps: <Switch checked={capsEnabled} onChange={e=>setCapsEnabled(e.target.checked)} ariaLabel="Toggle caps filter" /></div>
      </div>

      <div style={{marginTop:12}}>
        <Button variant="primary" onClick={async ()=>{
          if (!guildId) return showAlert('No guild selected');
          setLoading(true);
          const token = localStorage.getItem('qft-token');
          const payload = { automod: { enabled, spamThreshold, caps: capsEnabled, links: linksEnabled } };
          const res = await saveGuildConfig(guildId, payload, token);
          setLoading(false);
          await showAlert(res.success ? 'Saved' : `Failed: ${res.message}`);
        }}>{loading ? 'Saving...' : 'Save Automod Settings'}</Button>
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
