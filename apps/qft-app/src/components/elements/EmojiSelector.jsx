import React, { useEffect, useState } from 'react';
import Select from 'react-select';

// A small set of default Unicode emojis (expand as needed)
const defaultEmojis = [
  { value: '😀', label: '😀 Grinning Face' },
  { value: '😂', label: '😂 Face With Tears of Joy' },
  { value: '😎', label: '😎 Smiling Face With Sunglasses' },
  { value: '👍', label: '👍 Thumbs Up' },
  { value: '🎉', label: '🎉 Party Popper' },
  { value: '❤️', label: '❤️ Red Heart' },
  { value: '🔥', label: '🔥 Fire' },
  { value: '🙏', label: '🙏 Folded Hands' },
  { value: '😢', label: '😢 Crying Face' },
  { value: '😡', label: '😡 Angry Face' },
  { value: '🔔', label: '🔔 Bell' },
  { value: '❓', label: '❓ Question Mark' },
  // ...add more as needed
];

export default function EmojiSelector({ guildId, value, onChange }) {
  const [serverEmojis, setServerEmojis] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetch(`/api/guilds/${guildId}/emojis`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setServerEmojis(
            data.map(e => ({
              value: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`,
              label: (
                <span>
                  <img src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`} alt={e.name} style={{ width: 24, height: 24, verticalAlign: 'middle', marginRight: 6 }} />
                  {e.name}
                </span>
              ),
              raw: e
            }))
          );
        } else {
          setServerEmojis([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setServerEmojis([]);
        setLoading(false);
      });
  }, [guildId]);

  // Combine server and default emojis
  const options = [
    { label: 'Server Emojis', options: serverEmojis },
    { label: 'Default Emojis', options: defaultEmojis },
  ];

  return (
    <Select
      isClearable
      isSearchable
      options={options}
      value={
        value
          ? serverEmojis.find(e => e.value === value) || defaultEmojis.find(e => e.value === value) || { value, label: value }
          : null
      }
      onChange={opt => onChange(opt ? opt.value : '')}
      placeholder={loading ? 'Loading emojis...' : 'Select emoji (optional)'}
      formatOptionLabel={opt => opt.label}
      styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
    />
  );
}
