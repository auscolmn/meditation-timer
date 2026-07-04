import { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { THEME_OPTIONS } from '../utils/constants';
import type { Theme } from '../types';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

/**
 * Custom hook for managing app theme (light/dark/auto)
 */
export function useTheme(): UseThemeReturn {
  const { settings, updateSettings } = useApp();
  const theme: Theme = settings.theme || THEME_OPTIONS.AUTO;

  // Determine effective theme (what's actually shown)
  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    if (theme === THEME_OPTIONS.AUTO) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme as 'light' | 'dark';
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = () => {
      const effective = getEffectiveTheme();
      document.documentElement.setAttribute('data-theme', effective);

      // Keep browser/PWA chrome color in sync with the theme
      const themeColor = effective === 'dark' ? '#1A1918' : '#F7F7F7';
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = themeColor;
    };

    applyTheme();

    // Listen for system preference changes when in auto mode
    if (theme === THEME_OPTIONS.AUTO) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    return undefined;
  }, [theme, getEffectiveTheme]);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    updateSettings({ theme: newTheme });
  }, [updateSettings]);

  return {
    theme,
    setTheme,
    effectiveTheme: getEffectiveTheme()
  };
}

export default useTheme;
