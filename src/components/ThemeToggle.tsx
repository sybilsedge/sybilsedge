import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  // Server-render default is 'dark'; useEffect syncs to the value already
  // set by the anti-FOUC inline script before React hydrates.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme') as Theme | null;
    if (applied) {
      setTheme(applied);
    }
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  // Show Sun while in dark mode (click to go light); Moon while in light mode (click to go dark).
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center rounded px-2 py-1.5 font-tech text-cyan-300/70 transition-colors duration-150 hover:bg-white/5 hover:text-cyan-100"
    >
      {isDark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
    </button>
  );
}
