import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => { 
  // Initialize theme from localStorage, fallback to 'dark'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('qft-theme');
      return saved || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Persist theme to localStorage
    try {
      localStorage.setItem('qft-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      switch (prevTheme) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'glass';
        case 'glass':
          return 'cyber';
        case 'cyber':
          return 'holographic';
        case 'holographic':
          return 'light';
        // Add more cases here for additional themes like 'neomorphism', 'cyberpunk'
        default:
          return 'dark'; // Fallback
      }
    });
  };

  const setSpecificTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setSpecificTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
