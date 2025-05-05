import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Regular text button for desktop */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      </button>

      {/* Icon button for mobile */}
      <button
        className="theme-toggle-icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {
          theme === 'light'
            ? '🌙' /* Moon icon for dark mode toggle */
            : '☀️' /* Sun icon for light mode toggle */
        }
      </button>
    </>
  );
}

export default ThemeToggle;
