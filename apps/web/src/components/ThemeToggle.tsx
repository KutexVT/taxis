'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setDark(root.classList.contains('dark'));
    const apply = (value: string | null) => {
      root.dataset.themePreference = value === 'dark' || value === 'light' ? value : 'system';
      const next = value === 'dark' || (root.dataset.themePreference === 'system' && media.matches);
      root.classList.toggle('dark', next);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#121212' : '#ffffff');
      sync();
    };
    const systemChanged = () => { if (root.dataset.themePreference === 'system') apply(null); };
    const storageChanged = (event: StorageEvent) => { if (event.key === 'taxi-theme' || event.key === null) apply(event.newValue); };
    sync();
    media.addEventListener('change', systemChanged);
    window.addEventListener('storage', storageChanged);
    return () => { media.removeEventListener('change', systemChanged); window.removeEventListener('storage', storageChanged); };
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.dataset.themePreference = next ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#121212' : '#ffffff');
    try { localStorage.setItem('taxi-theme', next ? 'dark' : 'light'); } catch { /* The theme still works when storage is unavailable. */ }
    setDark(next);
  }

  return <button type="button" onClick={toggle} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} title={dark ? 'Activar modo claro' : 'Activar modo oscuro'} className="button-secondary !h-12 !w-12 shrink-0 !p-0">
    <span className="dark:hidden"><Icon name="moon" /></span><span className="hidden dark:inline"><Icon name="sun" /></span>
  </button>;
}
