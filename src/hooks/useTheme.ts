import { useEffect } from 'react';
import type { Theme } from '../types';

export function useTheme(theme: Theme): void {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolved =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;

      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = resolved;

      const themeColor = resolved === 'dark' ? '#08111d' : '#f5f2e8';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', themeColor);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);
}
