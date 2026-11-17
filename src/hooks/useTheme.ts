import { useEffect } from 'react';
import type { Theme } from '../types';

export function useTheme(theme: Theme): void {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolved =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;

      // El CSS solo necesita el tema resuelto; guardamos el ajuste original en
      // el store y exponemos en el DOM 'light' o 'dark'.
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;

      const themeColor = resolved === 'dark' ? '#0b1120' : '#f8fafc';
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', themeColor);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);
}
