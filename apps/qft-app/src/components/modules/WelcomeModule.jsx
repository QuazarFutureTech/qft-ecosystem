import React, { useState } from 'react';
import Input from '../elements/Input';
import Button from '../elements/Button';
import { fetchGuildConfig, saveGuildConfig } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';

export default function WelcomeModule({ guildId: guildIdProp }){
  const { userGuilds } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const guildId = guildIdProp || selectedGuildId || userGuilds?.[0]?.id;
  const [template,setTemplate] = useState('Welcome {user} to {guild}! You are member #{memberCount}.');
  const [loading,setLoading] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();
  
  // Image settings
  const [imageEnabled, setImageEnabled] = useState(false);
  const [imageMessage, setImageMessage] = useState('Welcome to the server!');
  const [imageBackground, setImageBackground] = useState('default.png');
  const [imageTextColor, setImageTextColor] = useState('#FFFFFF');
  const [circularAvatar, setCircularAvatar] = useState(true);
  const [availableBackgrounds, setAvailableBackgrounds] = useState(['default.png']);

  React.useEffect(()=>{
    async function load(){
      if (!guildId) return;
      const token = localStorage.getItem('qft-token');
      const res = await fetchGuildConfig(guildId, token);
      if (res.success && res.data.welcome) {
        setTemplate(res.data.welcome.template || template);
        
        // Load image settings
        const imgSettings = res.data.welcome.imageSettings || {};
        setImageEnabled(imgSettings.enabled === true);
        setImageMessage(imgSettings.message || 'Welcome to the server!');
        setImageBackground(imgSettings.background || 'default.png');
        setImageTextColor(imgSettings.textColor || '#FFFFFF');
        setCircularAvatar(imgSettings.circularAvatar !== false);
      }
    }
    load();
  },[guildId]);

  const renderPreview = () => {
    return template.replace('{user}','@ExampleUser').replace('{guild}','ExampleGuild').replace('{memberCount}','123');
  };

  return (
    <div className="qft-card">
      <h2>Welcome / Leave Messages</h2>
      <div className="qft-field">
        <label className="qft-label">Message Template</label>
        <textarea aria-label="Message template" value={template} onChange={e=>setTemplate(e.target.value)} className="qft-input" rows={4}></textarea>
        <small>Use variables: {'{user}'}, {'{guild}'}, {'{memberCount}'}</small>
      </div>
      
      {/* Welcome Image Settings */}
      <div className="qft-field" style={{marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px'}}>
        <h3 style={{marginTop: 0, marginBottom: '16px'}}>Welcome Image Generator</h3>
        
        <div className="qft-field">
          <label className="qft-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <input 
              type="checkbox" 
              checked={imageEnabled} 
              onChange={(e) => setImageEnabled(e.target.checked)}
              style={{width: 'auto'}}
            />
            Enable Welcome Images
          </label>
          <small>Generate a custom welcome card image with user avatar</small>
        </div>

        {imageEnabled && (
          <>
            <div className="qft-field">
              <label className="qft-label">Image Welcome Message</label>
              <input 
                type="text" 
                value={imageMessage} 
                onChange={(e) => setImageMessage(e.target.value)}
                className="qft-input"
                placeholder="Welcome to the server!"
              />
              <small>Text displayed on the welcome image</small>
            </div>

            <div className="qft-field">
              <label className="qft-label">Background Template</label>
              <select 
                value={imageBackground} 
                onChange={(e) => setImageBackground(e.target.value)}
                className="qft-input"
              >
                <option value="default.png">Default</option>
                {availableBackgrounds.filter(bg => bg !== 'default.png').map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              <small>Background image for the welcome card</small>
            </div>

            <div className="qft-field">
              <label className="qft-label">Text Color</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <input 
                  type="color" 
                  value={imageTextColor} 
                  onChange={(e) => setImageTextColor(e.target.value)}
                  style={{width: '60px', height: '36px', cursor: 'pointer'}}
                />
                <input 
                  type="text" 
                  value={imageTextColor} 
                  onChange={(e) => setImageTextColor(e.target.value)}
                  className="qft-input"
                  placeholder="#FFFFFF"
                  style={{flex: 1}}
                />
              </div>
              <small>Color of the text on the welcome image</small>
            </div>

            <div className="qft-field">
              <label className="qft-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <input 
                  type="checkbox" 
                  checked={circularAvatar} 
                  onChange={(e) => setCircularAvatar(e.target.checked)}
                  style={{width: 'auto'}}
                />
                Circular Avatar Mask
              </label>
              <small>Use a circular mask for the user avatar (unchecked = square)</small>
            </div>
          </>
        )}
      </div>
      
      <div style={{display:'flex',gap:8}}>
        <Button onClick={async ()=>{
          if (!guildId) return showAlert('No guild selected');
          setLoading(true);
          const token = localStorage.getItem('qft-token');
          const res = await saveGuildConfig(guildId, { 
            welcome: { 
              template,
              imageSettings: {
                enabled: imageEnabled,
                message: imageMessage,
                background: imageBackground,
                textColor: imageTextColor,
                circularAvatar: circularAvatar
              }
            } 
          }, token);
          setLoading(false);
          await showAlert(res.success ? 'Saved' : `Failed: ${res.message}`);
        }} variant="primary">{loading ? 'Saving...' : 'Save'}</Button>
        <Button onClick={()=>showAlert(renderPreview())}>Preview</Button>
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
