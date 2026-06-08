import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('rdtr-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem('rdtr-theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div className="pb-2 pt-1 flex justify-center">
      <div
        role="group"
        aria-label="Theme toggle"
        className="relative inline-flex items-center rounded-full bg-sidebar-foreground/10 p-0.5"
      >
        {/* Sliding indicator */}
        <span
          aria-hidden="true"
          className={`
            absolute top-0.5 bottom-0.5 w-6 rounded-full
            bg-sidebar-accent shadow-sm
            transition-transform duration-300 ease-out
            ${isDark ? 'translate-x-6' : 'translate-x-0'}
          `}
          style={{ left: '2px' }}
        />

        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Aktifkan Light Mode"
          aria-pressed={!isDark}
          title="Light Mode"
          className={`
            relative z-10 w-6 h-6 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${!isDark ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'}
          `}
        >
          <Sun className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Aktifkan Dark Mode"
          aria-pressed={isDark}
          title="Dark Mode"
          className={`
            relative z-10 w-6 h-6 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${isDark ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'}
          `}
        >
          <Moon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
