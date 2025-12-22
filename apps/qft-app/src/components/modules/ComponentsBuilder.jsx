import React, { useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { FaPlus, FaTrash, FaCopy, FaEye } from 'react-icons/fa';
import Switch from '../elements/Switch';
import './ComponentsBuilder.css';

const BUTTON_STYLES = {
  1: { name: 'Primary', color: '#5865F2' },
  2: { name: 'Secondary', color: '#4E5058' },
  3: { name: 'Success', color: '#57F287' },
  4: { name: 'Danger', color: '#ED4245' },
  5: { name: 'Link', color: '#00AFF4' }
};

const SELECT_MENU_TYPES = {
  'string_select': 'Text Options',
  'user_select': 'User Select',
  'role_select': 'Role Select',
  'mentionable_select': 'Mentionable Select',
  'channel_select': 'Channel Select'
};

export default function ComponentsBuilder() {
  const { showAlert, showPrompt } = useModal();
  const [componentVersion, setComponentVersion] = useState(2); // 1 or 2
  const [componentType, setComponentType] = useState('buttons'); // buttons, select, modal
  const [showPreview, setShowPreview] = useState(true);
  
  // Button state
  const [buttons, setButtons] = useState([]);
  
  // Select menu state
  const [selectMenu, setSelectMenu] = useState({
    type: 'string_select',
    placeholder: 'Choose an option...',
    minValues: 1,
    maxValues: 1,
    options: []
  });
  
  // Modal state
  const [modal, setModal] = useState({
    title: '',
    customId: '',
    components: []
  });

  // Button operations
  const addButton = () => {
    if (buttons.length >= 25) {
      return showAlert('Maximum 25 buttons per message (5 rows × 5 buttons)');
    }
    
    setButtons([...buttons, {
      label: 'New Button',
      style: 1,
      customId: `btn_${Date.now()}`,
      emoji: '',
      url: '',
      disabled: false
    }]);
  };

  const updateButton = (index, field, value) => {
    setButtons(buttons.map((btn, i) => 
      i === index ? { ...btn, [field]: value } : btn
    ));
  };

  const removeButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const moveButton = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= buttons.length) return;
    
    const newButtons = [...buttons];
    [newButtons[index], newButtons[newIndex]] = [newButtons[newIndex], newButtons[index]];
    setButtons(newButtons);
  };

  // Select menu operations
  const addSelectOption = () => {
    if (selectMenu.options.length >= 25) {
      return showAlert('Maximum 25 options per select menu');
    }
    
    setSelectMenu({
      ...selectMenu,
      options: [...selectMenu.options, {
        label: 'New Option',
        value: `option_${Date.now()}`,
        description: '',
        emoji: '',
        default: false
      }]
    });
  };

  const updateSelectOption = (index, field, value) => {
    setSelectMenu({
      ...selectMenu,
      options: selectMenu.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    });
  };

  const removeSelectOption = (index) => {
    setSelectMenu({
      ...selectMenu,
      options: selectMenu.options.filter((_, i) => i !== index)
    });
  };

  // Modal operations
  const addModalField = () => {
    if (modal.components.length >= 5) {
      return showAlert('Maximum 5 fields per modal');
    }
    
    setModal({
      ...modal,
      components: [...modal.components, {
        type: 4, // Text input
        style: 1, // Short
        label: 'New Field',
        customId: `field_${Date.now()}`,
        placeholder: '',
        required: true,
        minLength: 0,
        maxLength: 4000
      }]
    });
  };

  const updateModalField = (index, field, value) => {
    setModal({
      ...modal,
      components: modal.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    });
  };

  const removeModalField = (index) => {
    setModal({
      ...modal,
      components: modal.components.filter((_, i) => i !== index)
    });
  };

  // Export JSON
  const exportJSON = () => {
    let json;
    
    if (componentType === 'buttons') {
      // Build action rows (max 5 buttons per row)
      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        const rowButtons = buttons.slice(i, i + 5).map(btn => {
          const buttonData = {
            type: 2,
            style: btn.style,
            label: btn.label,
            disabled: btn.disabled
          };
          
          if (btn.style === 5) {
            buttonData.url = btn.url;
          } else {
            buttonData.custom_id = btn.customId;
          }
          
          if (btn.emoji) {
            // Try to parse emoji (could be unicode or custom <:name:id>)
            if (btn.emoji.match(/<a?:\w+:\d+>/)) {
              const match = btn.emoji.match(/<(a?):(\w+):(\d+)>/);
              buttonData.emoji = { name: match[2], id: match[3], animated: match[1] === 'a' };
            } else {
              buttonData.emoji = { name: btn.emoji };
            }
          }
          
          return buttonData;
        });
        
        rows.push({ type: 1, components: rowButtons });
      }
      
      json = { components: rows };
    } else if (componentType === 'select') {
      const menuData = {
        type: selectMenu.type === 'string_select' ? 3 : 
              selectMenu.type === 'user_select' ? 5 :
              selectMenu.type === 'role_select' ? 6 :
              selectMenu.type === 'mentionable_select' ? 7 : 8,
        custom_id: `select_${Date.now()}`,
        placeholder: selectMenu.placeholder,
        min_values: selectMenu.minValues,
        max_values: selectMenu.maxValues
      };
      
      if (selectMenu.type === 'string_select') {
        menuData.options = selectMenu.options.map(opt => ({
          label: opt.label,
          value: opt.value,
          description: opt.description || undefined,
          emoji: opt.emoji ? { name: opt.emoji } : undefined,
          default: opt.default
        }));
      }
      
      json = { components: [{ type: 1, components: [menuData] }] };
    } else if (componentType === 'modal') {
      json = {
        title: modal.title,
        custom_id: modal.customId,
        components: modal.components.map(field => ({
          type: 1,
          components: [{
            type: 4,
            style: field.style,
            label: field.label,
            custom_id: field.customId,
            placeholder: field.placeholder || undefined,
            required: field.required,
            min_length: field.minLength || undefined,
            max_length: field.maxLength
          }]
        }))
      };
    }
    
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    showAlert('JSON copied to clipboard!');
  };

  return (
    <div className="components-builder">
      <div className="builder-header">
        <h2>Discord Components Builder</h2>
        <div className="header-controls">
          <div className="version-toggle">
            <label>Component Version:</label>
            <button 
              className={componentVersion === 1 ? 'active' : ''}
              onClick={() => setComponentVersion(1)}
            >
              v1
            </button>
            <button 
              className={componentVersion === 2 ? 'active' : ''}
              onClick={() => setComponentVersion(2)}
            >
              v2
            </button>
          </div>
          
          <div className="type-selector">
            <select value={componentType} onChange={(e) => setComponentType(e.target.value)}>
              <option value="buttons">Buttons</option>
              <option value="select">Select Menu</option>
              <option value="modal">Modal</option>
            </select>
          </div>
          
          <button className="toggle-preview" onClick={() => setShowPreview(!showPreview)}>
            <FaEye /> {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          
          <button className="export-button" onClick={exportJSON}>
            <FaCopy /> Export JSON
          </button>
        </div>
      </div>

      <div className="builder-content">
        <div className="builder-panel">
          {/* BUTTONS BUILDER */}
          {componentType === 'buttons' && (
            <div className="buttons-builder">
              <div className="section-header">
                <h3>Buttons ({buttons.length}/25)</h3>
                <button className="add-button" onClick={addButton} disabled={buttons.length >= 25}>
                  <FaPlus /> Add Button
                </button>
              </div>
              
              <div className="buttons-list">
                {buttons.map((button, index) => (
                  <div key={index} className="button-config">
                    <div className="config-header">
                      <span>Button {index + 1}</span>
                      <button onClick={() => removeButton(index)} className="remove-btn">
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="form-field">
                      <label>Label</label>
                      <input
                        type="text"
                        value={button.label}
                        onChange={(e) => updateButton(index, 'label', e.target.value)}
                        maxLength={80}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Style</label>
                      <select
                        value={button.style}
                        onChange={(e) => updateButton(index, 'style', parseInt(e.target.value))}
                      >
                        {Object.entries(BUTTON_STYLES).map(([value, { name }]) => (
                          <option key={value} value={value}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {button.style === 5 ? (
                      <div className="form-field">
                        <label>URL</label>
                        <input
                          type="url"
                          value={button.url}
                          onChange={(e) => updateButton(index, 'url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    ) : (
                      <div className="form-field">
                        <label>Custom ID</label>
                        <input
                          type="text"
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
                        value={button.emoji}
                        onChange={(e) => updateButton(index, 'emoji', e.target.value)}
                        placeholder="😀 or <:name:id>"
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
            </div>
          )}

          {/* SELECT MENU BUILDER */}
          {componentType === 'select' && (
            <div className="select-builder">
              <div className="section-header">
                <h3>Select Menu</h3>
              </div>
              
              <div className="form-field">
                <label>Menu Type</label>
                <select
                  value={selectMenu.type}
                  onChange={(e) => setSelectMenu({ ...selectMenu, type: e.target.value })}
                >
                  {Object.entries(SELECT_MENU_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-field">
                <label>Placeholder</label>
                <input
                  type="text"
                  value={selectMenu.placeholder}
                  onChange={(e) => setSelectMenu({ ...selectMenu, placeholder: e.target.value })}
                  maxLength={150}
                />
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label>Min Values</label>
                  <input
                    type="number"
                    value={selectMenu.minValues}
                    onChange={(e) => setSelectMenu({ ...selectMenu, minValues: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={25}
                  />
                </div>
                
                <div className="form-field">
                  <label>Max Values</label>
                  <input
                    type="number"
                    value={selectMenu.maxValues}
                    onChange={(e) => setSelectMenu({ ...selectMenu, maxValues: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={25}
                  />
                </div>
              </div>
              
              {selectMenu.type === 'string_select' && (
                <>
                  <div className="section-header">
                    <h3>Options ({selectMenu.options.length}/25)</h3>
                    <button className="add-button" onClick={addSelectOption} disabled={selectMenu.options.length >= 25}>
                      <FaPlus /> Add Option
                    </button>
                  </div>
                  
                  <div className="options-list">
                    {selectMenu.options.map((option, index) => (
                      <div key={index} className="option-config">
                        <div className="config-header">
                          <span>Option {index + 1}</span>
                          <button onClick={() => removeSelectOption(index)} className="remove-btn">
                            <FaTrash />
                          </button>
                        </div>
                        
                        <div className="form-field">
                          <label>Label</label>
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateSelectOption(index, 'label', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        
                        <div className="form-field">
                          <label>Value</label>
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) => updateSelectOption(index, 'value', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        
                        <div className="form-field">
                          <label>Description (optional)</label>
                          <input
                            type="text"
                            value={option.description}
                            onChange={(e) => updateSelectOption(index, 'description', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        
                        <div className="form-field">
                          <label>Emoji (optional)</label>
                          <input
                            type="text"
                            value={option.emoji}
                            onChange={(e) => updateSelectOption(index, 'emoji', e.target.value)}
                            placeholder="😀"
                          />
                        </div>
                        
                        <div className="form-field">
                          <Switch
                            label="Default selected"
                            checked={option.default}
                            onChange={(e) => updateSelectOption(index, 'default', e.target.checked)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODAL BUILDER */}
          {componentType === 'modal' && (
            <div className="modal-builder">
              <div className="section-header">
                <h3>Modal Configuration</h3>
              </div>
              
              <div className="form-field">
                <label>Modal Title</label>
                <input
                  type="text"
                  value={modal.title}
                  onChange={(e) => setModal({ ...modal, title: e.target.value })}
                  maxLength={45}
                  placeholder="Survey, Form, etc."
                />
              </div>
              
              <div className="form-field">
                <label>Custom ID</label>
                <input
                  type="text"
                  value={modal.customId}
                  onChange={(e) => setModal({ ...modal, customId: e.target.value })}
                  maxLength={100}
                  placeholder="modal_id"
                />
              </div>
              
              <div className="section-header">
                <h3>Fields ({modal.components.length}/5)</h3>
                <button className="add-button" onClick={addModalField} disabled={modal.components.length >= 5}>
                  <FaPlus /> Add Field
                </button>
              </div>
              
              <div className="fields-list">
                {modal.components.map((field, index) => (
                  <div key={index} className="field-config">
                    <div className="config-header">
                      <span>Field {index + 1}</span>
                      <button onClick={() => removeModalField(index)} className="remove-btn">
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="form-field">
                      <label>Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateModalField(index, 'label', e.target.value)}
                        maxLength={45}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Style</label>
                      <select
                        value={field.style}
                        onChange={(e) => updateModalField(index, 'style', parseInt(e.target.value))}
                      >
                        <option value={1}>Short (Single Line)</option>
                        <option value={2}>Paragraph (Multi-line)</option>
                      </select>
                    </div>
                    
                    <div className="form-field">
                      <label>Custom ID</label>
                      <input
                        type="text"
                        value={field.customId}
                        onChange={(e) => updateModalField(index, 'customId', e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Placeholder (optional)</label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => updateModalField(index, 'placeholder', e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-field">
                        <label>Min Length</label>
                        <input
                          type="number"
                          value={field.minLength}
                          onChange={(e) => updateModalField(index, 'minLength', parseInt(e.target.value) || 0)}
                          min={0}
                          max={4000}
                        />
                      </div>
                      
                      <div className="form-field">
                        <label>Max Length</label>
                        <input
                          type="number"
                          value={field.maxLength}
                          onChange={(e) => updateModalField(index, 'maxLength', parseInt(e.target.value) || 4000)}
                          min={1}
                          max={4000}
                        />
                      </div>
                    </div>
                    
                    <div className="form-field">
                      <Switch
                        label="Required"
                        checked={field.required}
                        onChange={(e) => updateModalField(index, 'required', e.target.checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PREVIEW PANEL */}
        {showPreview && (
          <div className="preview-panel">
            <h3>Discord Preview</h3>
            <div className="discord-preview">
              {componentType === 'buttons' && buttons.length > 0 && (
                <div className="preview-buttons">
                  {buttons.map((button, index) => (
                    <button
                      key={index}
                      className={`discord-button style-${button.style}`}
                      disabled={button.disabled}
                      style={{ backgroundColor: button.disabled ? '#4E5058' : BUTTON_STYLES[button.style].color }}
                    >
                      {button.emoji && <span className="button-emoji">{button.emoji}</span>}
                      {button.label}
                    </button>
                  ))}
                </div>
              )}
              
              {componentType === 'select' && (
                <div className="preview-select">
                  <div className="discord-select">
                    <span>{selectMenu.placeholder}</span>
                    <span>▼</span>
                  </div>
                  {selectMenu.type === 'string_select' && selectMenu.options.length > 0 && (
                    <div className="select-options-preview">
                      {selectMenu.options.map((opt, i) => (
                        <div key={i} className={`select-option ${opt.default ? 'default' : ''}`}>
                          {opt.emoji && <span>{opt.emoji}</span>}
                          <div>
                            <div className="option-label">{opt.label}</div>
                            {opt.description && <div className="option-description">{opt.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {componentType === 'modal' && (
                <div className="preview-modal">
                  <div className="modal-header">{modal.title || 'Modal Title'}</div>
                  <div className="modal-body">
                    {modal.components.map((field, index) => (
                      <div key={index} className="modal-field">
                        <label>
                          {field.label} {field.required && <span className="required">*</span>}
                        </label>
                        {field.style === 1 ? (
                          <input type="text" placeholder={field.placeholder} />
                        ) : (
                          <textarea placeholder={field.placeholder} rows={3} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
