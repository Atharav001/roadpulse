import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Prefer light (civic default). Migrate away from older dark-by-default installs once.
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('roadpulse_theme');
    const migrated = localStorage.getItem('roadpulse_theme_v2');
    if (!migrated) {
      localStorage.setItem('roadpulse_theme_v2', '1');
      if (!saved) return 'light';
    }
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('roadpulse_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
