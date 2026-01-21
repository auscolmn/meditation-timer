import { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { THEME_OPTIONS } from '../utils/constants';

/**
 * Custom hook for managing app theme (light/dark/auto)
 * @returns {Object} { theme, setTheme, effectiveTheme }
 */
export function useTheme() {
  const { settings, updateSettings } = useApp();
  const theme = settings.theme || THEME_OPTIONS.AUTO;

  // Determine effective theme (what's actually shown)
  const getEffectiveTheme = useCallback(() => {
    if (theme === THEME_OPTIONS.AUTO) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEME_OPTIONS.DARK
        : THEME_OPTIONS.LIGHT;
    }
    return theme;
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = () => {
      const effective = getEffectiveTheme();
      document.documentElement.setAttribute('data-theme', effective);
    };

    applyTheme();

    // Listen for system preference changes when in auto mode
    if (theme === THEME_OPTIONS.AUTO) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, getEffectiveTheme]);

  // Set theme
  const setTheme = useCallback((newTheme) => {
    updateSettings({ theme: newTheme });
  }, [updateSettings]);

  return {
    theme,
    setTheme,
    effectiveTheme: getEffectiveTheme()
  };
}

export default useTheme;
