import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle(){
  const { theme, setSpecificTheme } = useTheme();

  const themes = ['light','dark','glass','cyber'];

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme selector">
      {themes.map(t => (
        <button key={t} onClick={()=>setSpecificTheme(t)} aria-pressed={theme===t} style={{marginRight:6}}>
          {t}
        </button>
      ))}
    </div>
  );
}
