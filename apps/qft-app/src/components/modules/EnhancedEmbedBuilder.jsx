import React, { useState, useEffect } from 'react';
import { ChannelSelector } from '../elements/GuildDropdowns.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import { postEmbed } from '../../services/discord';
import { saveEmbedTemplate, getEmbedTemplates, deleteEmbedTemplate } from '../../services/embedTemplates';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../elements/Toast';
import ConfirmModal from '../elements/ConfirmModal';
import Switch from '../elements/Switch';
import { FaPlus, FaTrash, FaPaperPlane, FaArrowUp, FaArrowDown, FaSave, FaFolderOpen, FaClock, FaEdit } from 'react-icons/fa';
import './EnhancedEmbedBuilder.css';

const PRESET_COLORS = {
  'Blurple': '#5865F2',
  'Green': '#57F287',
  'Yellow': '#FEE75C',
  'Fuchsia': '#EB459E',
  'Red': '#ED4245',
  'White': '#FFFFFF',
  'Black': '#000000',
  'Greyple': '#99AAB5',
  'Dark': '#2C2F33',
  'Not Quite Black': '#23272A'
};

export default function EnhancedEmbedBuilder() {
  const { selectedGuildId } = useSelectedGuild();
  const { modalState, showAlert, showPrompt, showConfirm, closeModal } = useModal();
  const { toasts, removeToast, success, error, info } = useToast();
  const [sending, setSending] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Embed state
  const [embed, setEmbed] = useState({
    title: '',
    description: '',
    url: '',
    color: '#5865F2',
    author: { name: '', iconUrl: '', url: '' },
    footer: { text: '', iconUrl: '' },
    image: '',
    thumbnail: '',
    timestamp: false,
    fields: []
  });

  // Buttons state
  const [buttons, setButtons] = useState([]);

  // Select Menus state
  const [selectMenus, setSelectMenus] = useState([]);

  // Load templates when guild changes
  useEffect(() => {
    if (selectedGuildId) {
      loadTemplates();
    }
  }, [selectedGuildId]);

  const loadTemplates = async () => {
    const token = localStorage.getItem('qft-token');
    const result = await getEmbedTemplates(selectedGuildId, token);
    if (result.success) {
      setTemplates(result.templates);
    }
  };

  const updateEmbed = (field, value) => {
    setEmbed(prev => ({ ...prev, [field]: value }));
  };

  const updateNested = (parent, field, value) => {
    setEmbed(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const addField = () => {
    setEmbed(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', value: '', inline: false }]
    }));
  };

  const updateField = (index, field, value) => {
    setEmbed(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  };

  const removeField = (index) => {
    setEmbed(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const moveField = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= embed.fields.length) return;
    
    setEmbed(prev => {
      const fields = [...prev.fields];
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      return { ...prev, fields };
    });
  };

  const handleSend = async () => {
    if (!selectedGuildId) {
      error('Please select a guild');
      return;
    }
    if (!selectedChannel) {
      error('Please select a channel');
      return;
    }
    
    if (scheduleMode) {
      if (!scheduledTime) {
        error('Please select a date and time');
        return;
      }
      
      const scheduleDate = new Date(scheduledTime);
      const now = new Date();
      
      if (scheduleDate <= now) {
        error('Scheduled time must be in the future');
        return;
      }
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem('qft-token');
      
      // Build Discord-compatible embed
      const discordEmbed = {
        title: embed.title || undefined,
        description: embed.description || undefined,
        url: embed.url || undefined,
        color: parseInt(embed.color.replace('#', ''), 16),
        timestamp: embed.timestamp ? new Date().toISOString() : undefined,
        author: embed.author.name ? {
          name: embed.author.name,
          icon_url: embed.author.iconUrl || undefined,
          url: embed.author.url || undefined
        } : undefined,
        footer: embed.footer.text ? {
          text: embed.footer.text,
          icon_url: embed.footer.iconUrl || undefined
        } : undefined,
        image: embed.image ? { url: embed.image } : undefined,
        thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
        fields: embed.fields.filter(f => f.name && f.value).map(f => ({
          name: f.name,
          value: f.value,
          inline: f.inline
        }))
      };

      // Build components (action rows with buttons and select menus)
      let components = [];
      
      // Add button rows (max 5 buttons per row)
      if (buttons.length > 0) {
        for (let i = 0; i < buttons.length; i += 5) {
          const rowButtons = buttons.slice(i, i + 5).map(btn => ({
            type: 2,
            style: btn.style,
            label: btn.label,
            custom_id: btn.style === 5 ? undefined : btn.customId,
            url: btn.style === 5 ? btn.url : undefined,
            emoji: btn.emoji ? { name: btn.emoji } : undefined,
            disabled: btn.disabled || false
          }));
          
          components.push({
            type: 1,
            components: rowButtons
          });
        }
      }
      
      // Add select menu rows (one select menu per row)
      if (selectMenus.length > 0) {
        selectMenus.forEach(menu => {
          const selectComponent = {
            type: menu.type,
            custom_id: menu.customId,
            placeholder: menu.placeholder || undefined,
            min_values: menu.minValues,
            max_values: menu.maxValues,
            disabled: menu.disabled || false
          };
          
          // Only string select menus (type 3) need options
          if (menu.type === 3 && menu.options && menu.options.length > 0) {
            selectComponent.options = menu.options
              .filter(opt => opt.label && opt.value)
              .map(opt => ({
                label: opt.label,
                value: opt.value,
                description: opt.description || undefined,
                emoji: opt.emoji ? { name: opt.emoji } : undefined,
                default: opt.default || false
              }));
          }
          
          components.push({
            type: 1,
            components: [selectComponent]
          });
        });
      }
      
      // Only set components if we have any
      if (components.length === 0) components = undefined;

      if (scheduleMode) {
        console.log('Schedule mode active, time:', scheduledTime);
        info(`Embed will be posted at ${new Date(scheduledTime).toLocaleString()}`);
        // TODO: Implement actual scheduling backend
        // For now, this is just a UI placeholder
        setSending(false);
        return;
      }

      console.log('Posting embed:', { guildId: selectedGuildId, channelId: selectedChannel, embed: discordEmbed, components });

      await postEmbed({ 
        guildId: selectedGuildId, 
        channelId: selectedChannel, 
        embed: discordEmbed,
        components 
      }, token);
      
      success('Embed sent successfully!');
    } catch (err) {
      console.error('Send error:', err);
      error(`Failed to send embed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const addButton = () => {
    if (buttons.length >= 25) return;
    setButtons(prev => [...prev, {
      label: '',
      customId: `button_${Date.now()}`,
      style: 1, // Primary
      url: '',
      emoji: '',
      disabled: false
    }]);
  };

  const updateButton = (index, field, value) => {
    setButtons(prev => prev.map((btn, i) => 
      i === index ? { ...btn, [field]: value } : btn
    ));
  };

  const removeButton = (index) => {
    setButtons(prev => prev.filter((_, i) => i !== index));
  };

  const addSelectMenu = () => {
    if (selectMenus.length >= 5) return; // Max 5 action rows
    setSelectMenus(prev => [...prev, {
      type: 3, // String select by default
      customId: `menu_${Date.now()}`,
      placeholder: 'Make a selection...',
      minValues: 1,
      maxValues: 1,
      disabled: false,
      options: [] // For string select menus only
    }]);
  };

  const updateSelectMenu = (index, field, value) => {
    setSelectMenus(prev => prev.map((menu, i) => 
      i === index ? { ...menu, [field]: value } : menu
    ));
  };

  const removeSelectMenu = (index) => {
    setSelectMenus(prev => prev.filter((_, i) => i !== index));
  };

  const addMenuOption = (menuIndex) => {
    setSelectMenus(prev => prev.map((menu, i) => {
      if (i !== menuIndex) return menu;
      return {
        ...menu,
        options: [...(menu.options || []), {
          label: '',
          value: `opt_${Date.now()}`,
          description: '',
          emoji: '',
          default: false
        }]
      };
    }));
  };

  const updateMenuOption = (menuIndex, optionIndex, field, value) => {
    setSelectMenus(prev => prev.map((menu, i) => {
      if (i !== menuIndex) return menu;
      return {
        ...menu,
        options: menu.options.map((opt, j) =>
          j === optionIndex ? { ...opt, [field]: value } : opt
        )
      };
    }));
  };

  const removeMenuOption = (menuIndex, optionIndex) => {
    setSelectMenus(prev => prev.map((menu, i) => {
      if (i !== menuIndex) return menu;
      return {
        ...menu,
        options: menu.options.filter((_, j) => j !== optionIndex)
      };
    }));
  };

  const handleSaveTemplate = async () => {
    if (!selectedGuildId) {
      error('Please select a guild');
      return;
    }
    
    let templateName;
    if (editingTemplate) {
      const confirmed = await showConfirm(`Update template "${editingTemplate.template_name}"?`);
      if (!confirmed) return;
      templateName = editingTemplate.template_name;
    } else {
      templateName = await showPrompt('Enter a name for this template:');
      if (!templateName) return;
    }
    
    console.log('Saving template:', { templateName, embed, buttons });
    
    try {
      const token = localStorage.getItem('qft-token');
      const templateData = { embed, buttons, selectMenus };
      console.log('Template data to save:', templateData);
      
      const result = await saveEmbedTemplate(selectedGuildId, templateName, templateData, token);
      console.log('Save result:', result);
      
      if (result.success) {
        success(editingTemplate ? 'Template updated successfully!' : 'Template saved successfully!');
        setEditingTemplate(null);
        await loadTemplates();
      } else {
        error(`Failed to save template: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Save template error:', err);
      error(`Failed to save template: ${err.message}`);
    }
  };

  const handleLoadTemplate = (template) => {
    try {
      const data = template.embed_data;
      setEmbed(data.embed || data);
      setButtons(data.buttons || []);
      setSelectMenus(data.selectMenus || []);
      setShowTemplates(false);
      success(`Loaded template: ${template.template_name}`);
    } catch (err) {
      error('Failed to load template');
    }
  };

  const handleEditTemplate = (template) => {
    try {
      const data = template.embed_data;
      setEmbed(data.embed || data);
      setButtons(data.buttons || []);
      setSelectMenus(data.selectMenus || []);
      setEditingTemplate(template);
      setShowTemplates(false);
      info(`Editing template: ${template.template_name}. Click "Save Template" to update.`);
    } catch (err) {
      error('Failed to load template for editing');
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    const confirmed = await showConfirm(`Delete template "${templateName}"?`);
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('qft-token');
      const result = await deleteEmbedTemplate(templateId, selectedGuildId, token);
      
      if (result.success) {
        success('Template deleted successfully!');
        loadTemplates();
      } else {
        error(`Failed to delete template: ${result.error}`);
      }
    } catch (err) {
      error(`Failed to delete template: ${err.message}`);
    }
  };

  return (
    <div className="enhanced-embed-builder">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="builder-header">
        <h2>Enhanced Embed Builder</h2>
        <div className="header-actions">
          <button className="qft-button secondary" onClick={() => setShowTemplates(!showTemplates)}>
            <FaFolderOpen /> {showTemplates ? 'Hide Templates' : 'Load Template'}
          </button>
          <button className="qft-button secondary" onClick={handleSaveTemplate}>
            <FaSave /> {editingTemplate ? 'Update Template' : 'Save Template'}
          </button>
          {editingTemplate && (
            <button className="qft-button" onClick={() => { setEditingTemplate(null); info('Editing cancelled'); }}>
              Cancel Edit
            </button>
          )}
          <div style={{ width: '300px' }}>
            <ChannelSelector
              value={selectedChannel}
              onChange={setSelectedChannel}
              placeholder="Select channel to post in..."
              filter={(c) => c.type === 0 || c.type === 5}
            />
          </div>
          <Switch
            label="Schedule"
            checked={scheduleMode}
            onChange={(e) => setScheduleMode(e.target.checked)}
            ariaLabel="Toggle schedule mode"
          />
          {scheduleMode && (
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="schedule-input"
            />
          )}
          <button className="send-button" onClick={handleSend} disabled={sending}>
            <FaPaperPlane /> {sending ? 'Sending...' : (scheduleMode ? 'Schedule' : 'Send Now')}
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="templates-panel">
          <h3>Saved Templates ({templates.length})</h3>
          {templates.length === 0 ? (
            <p className="no-templates">No saved templates yet. Create an embed and click "Save Template".</p>
          ) : (
            <div className="templates-list">
              {templates.map(template => (
                <div key={template.id} className="template-item">
                  <div className="template-info">
                    <strong>{template.template_name}</strong>
                    <small>Updated: {new Date(template.updated_at).toLocaleDateString()}</small>
                  </div>
                  <div className="template-actions">
                    <button className="qft-button primary" onClick={() => handleLoadTemplate(template)}>
                      Load
                    </button>
                    <button className="qft-button secondary" onClick={() => handleEditTemplate(template)}>
                      <FaEdit />
                    </button>
                    <button className="qft-button danger" onClick={() => handleDeleteTemplate(template.id, template.template_name)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="builder-content">
        {/* Left Panel - Builder */}
        <div className="builder-panel">
          <div className="builder-section">
            <h3>Basic Information</h3>
            
            <div className="form-field">
              <label>Embed Title</label>
              <input
                type="text"
                placeholder="Embed title"
                value={embed.title}
                onChange={(e) => updateEmbed('title', e.target.value)}
                maxLength={256}
              />
              <small>{embed.title.length}/256</small>
            </div>

            <div className="form-field">
              <label>Title URL (optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={embed.url}
                onChange={(e) => updateEmbed('url', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <textarea
                placeholder="Embed description"
                value={embed.description}
                onChange={(e) => updateEmbed('description', e.target.value)}
                rows={4}
                maxLength={4096}
              />
              <small>{embed.description.length}/4096</small>
            </div>

            <div className="form-field">
              <label>Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  value={embed.color}
                  onChange={(e) => updateEmbed('color', e.target.value)}
                />
                <span>{embed.color}</span>
              </div>
              <div className="color-presets">
                {Object.entries(PRESET_COLORS).map(([name, color]) => (
                  <button
                    key={name}
                    className="color-preset"
                    style={{ backgroundColor: color }}
                    onClick={() => updateEmbed('color', color)}
                    title={name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="builder-section">
            <h3>Author</h3>
            <div className="form-field">
              <input
                type="text"
                placeholder="Author name"
                value={embed.author.name}
                onChange={(e) => updateNested('author', 'name', e.target.value)}
                maxLength={256}
              />
            </div>
            <div className="form-field">
              <input
                type="url"
                placeholder="Author icon URL"
                value={embed.author.iconUrl}
                onChange={(e) => updateNested('author', 'iconUrl', e.target.value)}
              />
            </div>
            <div className="form-field">
              <input
                type="url"
                placeholder="Author URL"
                value={embed.author.url}
                onChange={(e) => updateNested('author', 'url', e.target.value)}
              />
            </div>
          </div>

          <div className="builder-section">
            <h3>Images</h3>
            <div className="form-field">
              <label>Main Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={embed.image}
                onChange={(e) => updateEmbed('image', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Thumbnail URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={embed.thumbnail}
                onChange={(e) => updateEmbed('thumbnail', e.target.value)}
              />
            </div>
          </div>

          <div className="builder-section">
            <div className="section-header">
              <h3>Fields ({embed.fields.length}/25)</h3>
              <button className="add-button" onClick={addField} disabled={embed.fields.length >= 25}>
                <FaPlus /> Add Field
              </button>
            </div>
            
            {embed.fields.map((field, index) => (
              <div key={index} className="field-item">
                <div className="field-header">
                  <span>Field {index + 1}</span>
                  <div className="field-actions">
                    <button onClick={() => moveField(index, -1)} disabled={index === 0} title="Move up">
                      <FaArrowUp />
                    </button>
                    <button onClick={() => moveField(index, 1)} disabled={index === embed.fields.length - 1} title="Move down">
                      <FaArrowDown />
                    </button>
                    <button onClick={() => removeField(index)} title="Remove field">
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <input
                    type="text"
                    placeholder="Field name"
                    value={field.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    maxLength={256}
                  />
                </div>
                <div className="form-field">
                  <textarea
                    placeholder="Field value"
                    value={field.value}
                    onChange={(e) => updateField(index, 'value', e.target.value)}
                    rows={2}
                    maxLength={1024}
                  />
                </div>
                <div className="form-field">
                  <Switch
                    label="Display inline"
                    checked={field.inline}
                    onChange={(e) => updateField(index, 'inline', e.target.checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="builder-section">
            <h3>Footer</h3>
            <div className="form-field">
              <input
                type="text"
                placeholder="Footer text"
                value={embed.footer.text}
                onChange={(e) => updateNested('footer', 'text', e.target.value)}
                maxLength={2048}
              />
            </div>
            <div className="form-field">
              <input
                type="url"
                placeholder="Footer icon URL"
                value={embed.footer.iconUrl}
                onChange={(e) => updateNested('footer', 'iconUrl', e.target.value)}
              />
            </div>
            <div className="form-field">
              <Switch
                label="Add timestamp"
                checked={embed.timestamp}
                onChange={(e) => updateEmbed('timestamp', e.target.checked)}
              />
            </div>
          </div>

          <div className="builder-section">
            <div className="section-header">
              <h3>Buttons ({buttons.length}/25)</h3>
              <button className="add-button" onClick={addButton} disabled={buttons.length >= 25}>
                <FaPlus /> Add Button
              </button>
            </div>
            
            {buttons.map((button, index) => (
              <div key={index} className="button-config">
                <div className="config-header">
                  <span>Button {index + 1}</span>
                  <button className="remove-btn" onClick={() => removeButton(index)}>
                    <FaTrash />
                  </button>
                </div>
                
                <div className="form-field">
                  <label>Button Style</label>
                  <select
                    value={button.style}
                    onChange={(e) => updateButton(index, 'style', parseInt(e.target.value))}
                  >
                    <option value={1}>Primary (Blue)</option>
                    <option value={2}>Secondary (Gray)</option>
                    <option value={3}>Success (Green)</option>
                    <option value={4}>Danger (Red)</option>
                    <option value={5}>Link</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Button Label</label>
                  <input
                    type="text"
                    placeholder="Click me!"
                    value={button.label}
                    onChange={(e) => updateButton(index, 'label', e.target.value)}
                    maxLength={80}
                  />
                </div>

                {button.style === 5 ? (
                  <div className="form-field">
                    <label>URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={button.url}
                      onChange={(e) => updateButton(index, 'url', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-field">
                    <label>Custom ID</label>
                    <input
                      type="text"
                      placeholder="button_id"
                      value={button.customId}
                      onChange={(e) => updateButton(index, 'customId', e.target.value)}
                      maxLength={100}
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Emoji (optional)</label>
                  <input
                    type="text"
                    placeholder="😀"
                    value={button.emoji}
                    onChange={(e) => updateButton(index, 'emoji', e.target.value)}
                    maxLength={10}
                  />
                </div>

                <div className="form-field">
                  <Switch
                    label="Disabled"
                    checked={button.disabled}
                    onChange={(e) => updateButton(index, 'disabled', e.target.checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="builder-section">
            <div className="section-header">
              <h3>Select Menus ({selectMenus.length}/5)</h3>
              <button className="add-button" onClick={addSelectMenu} disabled={selectMenus.length >= 5}>
                <FaPlus /> Add Select Menu
              </button>
            </div>
            
            {selectMenus.map((menu, menuIndex) => (
              <div key={menuIndex} className="button-config">
                <div className="config-header">
                  <span>Select Menu {menuIndex + 1}</span>
                  <button className="remove-btn" onClick={() => removeSelectMenu(menuIndex)}>
                    <FaTrash />
                  </button>
                </div>
                
                <div className="form-field">
                  <label>Menu Type</label>
                  <select
                    value={menu.type}
                    onChange={(e) => updateSelectMenu(menuIndex, 'type', parseInt(e.target.value))}
                  >
                    <option value={3}>Text (String Select)</option>
                    <option value={5}>User Select</option>
                    <option value={6}>Role Select</option>
                    <option value={7}>Mentionable Select</option>
                    <option value={8}>Channel Select</option>
                  </select>
                  <small>
                    {menu.type === 3 && 'Custom text options'}
                    {menu.type === 5 && 'Let users select members'}
                    {menu.type === 6 && 'Let users select roles'}
                    {menu.type === 7 && 'Let users select users or roles'}
                    {menu.type === 8 && 'Let users select channels'}
                  </small>
                </div>

                <div className="form-field">
                  <label>Custom ID</label>
                  <input
                    type="text"
                    placeholder="menu_id"
                    value={menu.customId}
                    onChange={(e) => updateSelectMenu(menuIndex, 'customId', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="form-field">
                  <label>Placeholder</label>
                  <input
                    type="text"
                    placeholder="Make a selection..."
                    value={menu.placeholder}
                    onChange={(e) => updateSelectMenu(menuIndex, 'placeholder', e.target.value)}
                    maxLength={150}
                  />
                </div>

                <div className="form-field">
                  <label>Min Values</label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={menu.minValues}
                    onChange={(e) => updateSelectMenu(menuIndex, 'minValues', parseInt(e.target.value))}
                  />
                </div>

                <div className="form-field">
                  <label>Max Values</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={menu.maxValues}
                    onChange={(e) => updateSelectMenu(menuIndex, 'maxValues', parseInt(e.target.value))}
                  />
                </div>

                <div className="form-field">
                  <Switch
                    label="Disabled"
                    checked={menu.disabled}
                    onChange={(e) => updateSelectMenu(menuIndex, 'disabled', e.target.checked)}
                  />
                </div>

                {menu.type === 3 && (
                  <div className="menu-options">
                    <div className="section-header">
                      <label>Options ({(menu.options || []).length}/25)</label>
                      <button 
                        className="add-button" 
                        onClick={() => addMenuOption(menuIndex)}
                        disabled={(menu.options || []).length >= 25}
                      >
                        <FaPlus /> Add Option
                      </button>
                    </div>
                    
                    {(menu.options || []).map((option, optIndex) => (
                      <div key={optIndex} className="menu-option-item">
                        <div className="option-header">
                          <span>Option {optIndex + 1}</span>
                          <button onClick={() => removeMenuOption(menuIndex, optIndex)}>
                            <FaTrash />
                          </button>
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Label"
                          value={option.label}
                          onChange={(e) => updateMenuOption(menuIndex, optIndex, 'label', e.target.value)}
                          maxLength={100}
                        />
                        
                        <input
                          type="text"
                          placeholder="Value"
                          value={option.value}
                          onChange={(e) => updateMenuOption(menuIndex, optIndex, 'value', e.target.value)}
                          maxLength={100}
                        />
                        
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={option.description}
                          onChange={(e) => updateMenuOption(menuIndex, optIndex, 'description', e.target.value)}
                          maxLength={100}
                        />
                        
                        <input
                          type="text"
                          placeholder="Emoji (optional)"
                          value={option.emoji}
                          onChange={(e) => updateMenuOption(menuIndex, optIndex, 'emoji', e.target.value)}
                          maxLength={10}
                        />
                        
                        <Switch
                          label="Default selected"
                          checked={option.default}
                          onChange={(e) => updateMenuOption(menuIndex, optIndex, 'default', e.target.checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="preview-panel">
          <h3>Preview</h3>
          <div className="discord-embed-preview">
            <div className="discord-embed" style={{ borderColor: embed.color }}>
              {embed.author.name && (
                <div className="embed-author">
                  {embed.author.iconUrl && <img src={embed.author.iconUrl} alt="" className="author-icon" />}
                  <span className="author-name">{embed.author.name}</span>
                </div>
              )}
              
              {embed.title && (
                <div className="embed-title">
                  {embed.url ? <a href={embed.url} target="_blank" rel="noopener noreferrer">{embed.title}</a> : embed.title}
                </div>
              )}
              
              {embed.description && <div className="embed-description">{embed.description}</div>}
              
              {embed.fields.length > 0 && (
                <div className="embed-fields">
                  {embed.fields.map((field, index) => (
                    field.name && field.value && (
                      <div key={index} className={`embed-field ${field.inline ? 'inline' : ''}`}>
                        <div className="field-name">{field.name}</div>
                        <div className="field-value">{field.value}</div>
                      </div>
                    )
                  ))}
                </div>
              )}
              
              {embed.image && <img src={embed.image} alt="" className="embed-image" />}
              
              {(embed.footer.text || embed.timestamp) && (
                <div className="embed-footer">
                  {embed.footer.iconUrl && <img src={embed.footer.iconUrl} alt="" className="footer-icon" />}
                  <span>
                    {embed.footer.text}
                    {embed.footer.text && embed.timestamp && ' • '}
                    {embed.timestamp && new Date().toLocaleString()}
                  </span>
                </div>
              )}
              
              {embed.thumbnail && <img src={embed.thumbnail} alt="" className="embed-thumbnail" />}
            </div>
            
            {/* Buttons Preview */}
            {buttons.length > 0 && (
              <div className="preview-buttons">
                {buttons.map((button, index) => {
                  const styleColors = {
                    1: '#5865F2', // Primary
                    2: '#4E5058', // Secondary
                    3: '#3BA55D', // Success
                    4: '#ED4245', // Danger
                    5: 'transparent' // Link
                  };
                  
                  return (
                    <button
                      key={index}
                      className="discord-button"
                      style={{ 
                        backgroundColor: styleColors[button.style],
                        color: button.style === 5 ? '#00AFF4' : 'white',
                        textDecoration: button.style === 5 ? 'underline' : 'none',
                        opacity: button.disabled ? 0.5 : 1
                      }}
                      disabled={button.disabled}
                    >
                      {button.emoji && <span className="button-emoji">{button.emoji}</span>}
                      {button.label || 'Button'}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Select Menus Preview */}
            {selectMenus.length > 0 && selectMenus.map((menu, index) => {
              const menuTypeLabels = {
                3: 'Select an option',
                5: 'Select users',
                6: 'Select roles',
                7: 'Select users or roles',
                8: 'Select channels'
              };
              
              return (
                <div key={index} className="discord-select-menu" style={{ opacity: menu.disabled ? 0.5 : 1 }}>
                  <span>{menu.placeholder || menuTypeLabels[menu.type]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        inputValue={modalState.inputValue}
      />
    </div>
  );
}
