import { useState, useEffect } from 'react';

function ThemeToggle({ theme, onToggle }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const isDark = theme === 'dark';

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle();
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <button
      onClick={handleToggle}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
      style={{
        '--toggle-bg': isDark ? 'var(--surface-muted)' : '#e0e7ff',
        '--toggle-border': isDark ? 'var(--border-color)' : '#c7d2fe',
        '--slider-bg': isDark ? 'var(--accent)' : '#4f46e5',
        '--icon-inactive': isDark ? 'var(--text-muted)' : '#94a3b8',
        '--icon-active': '#ffffff',
      }}
    >
      <span className="theme-toggle-track">
        {/* Sliding indicator */}
        <span
          className="theme-toggle-slider"
          style={{
            transform: isDark ? 'translateX(0)' : 'translateX(24px)',
          }}
        />

        {/* Moon icon (left - dark mode) */}
        <span
          className="theme-toggle-icon"
          style={{
            color: isDark ? 'var(--icon-active)' : 'var(--icon-inactive)',
            transform: isAnimating && !isDark ? 'scale(0.8) rotate(-30deg)' : 'scale(1) rotate(0)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        </span>

        {/* Sun icon (right - light mode) */}
        <span
          className="theme-toggle-icon"
          style={{
            color: !isDark ? 'var(--icon-active)' : 'var(--icon-inactive)',
            transform: isAnimating && isDark ? 'scale(0.8) rotate(30deg)' : 'scale(1) rotate(0)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
        </span>
      </span>

      {/* Label */}
      <span className="theme-toggle-label">
        {isDark ? 'Dark' : 'Light'}
      </span>

      <style>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px 6px 6px;
          background: var(--toggle-bg);
          border: 1px solid var(--toggle-border);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .theme-toggle:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        .theme-toggle:focus-visible {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        .theme-toggle-track {
          position: relative;
          display: flex;
          align-items: center;
          width: 48px;
          height: 24px;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 12px;
        }

        .theme-toggle-slider {
          position: absolute;
          width: 24px;
          height: 24px;
          background: var(--slider-bg);
          border-radius: 50%;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          left: 0;
        }

        .theme-toggle-icon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .theme-toggle-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 32px;
          transition: color 0.3s ease;
        }
      `}</style>
    </button>
  );
}

export default ThemeToggle;
