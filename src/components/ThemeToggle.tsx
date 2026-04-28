import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  // Server-render default is 'dark'; useEffect syncs to the value already
  // set by the anti-FOUC inline script before React hydrates.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Sync initial value from the DOM (already set by the anti-FOUC script).
    const initial = document.documentElement.getAttribute('data-theme');
    if (initial === 'dark' || initial === 'light') {
      setTheme(initial);
    }

    // Keep multiple toggle instances in sync via a MutationObserver so that
    // toggling the desktop version updates the mobile version and vice versa.
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'dark' || current === 'light') {
        setTheme(current);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    // Setting the attribute triggers MutationObserver on all mounted instances.
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) {
      // Ignore storage access failures (e.g. private browsing restrictions).
    }
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
