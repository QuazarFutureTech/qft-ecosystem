import React, { useState } from 'react';
import Switch from '../elements/Switch';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { fetchGuildConfig, saveGuildConfig } from '../../services/admin';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

const defaultCategories = ['moderation','utility','tickets','admin','custom','automod'];

export default function CommandToggleModule({ guildId: guildIdProp }){
  const { userGuilds } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const guildId = guildIdProp || selectedGuildId || userGuilds?.[0]?.id;
  const [states,setStates] = useState(()=> defaultCategories.reduce((a,c)=>{a[c]=true;return a},{ }));
  const [loading,setLoading] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  React.useEffect(()=>{ const load = async ()=>{ if (!guildId) return; const token = localStorage.getItem('qft-token'); const res = await fetchGuildConfig(guildId, token); if (res.success && res.data.categories) setStates(s=>({ ...s, ...res.data.categories })); }; load(); }, [guildId]);

  const toggle = (k) => setStates(s=>({ ...s, [k]: !s[k] }));

  return (
    <div className="qft-card">
      <h2>Command Categories</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:16}}>
        {defaultCategories.map(cat=> (
          <Switch 
            key={cat}
            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
            checked={states[cat]} 
            onChange={()=>toggle(cat)} 
            ariaLabel={`Toggle ${cat}`} 
          />
        ))}
      </div>
      <div style={{marginTop:20}}>
        <button className="qft-button primary" onClick={async ()=>{ if (!guildId) return showAlert('No guild selected'); setLoading(true); const token = localStorage.getItem('qft-token'); const res = await saveGuildConfig(guildId, { categories: states }, token); setLoading(false); await showAlert(res.success ? 'Saved' : `Failed: ${res.message}`); }}>{loading? 'Saving...':'Save Categories'}</button>
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
