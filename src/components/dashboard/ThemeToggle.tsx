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
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Aktifkan Dark Mode"
        title="Dark Mode"
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all duration-200 ease-out
          ${isDark
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm scale-105'
            : 'bg-transparent text-sidebar-foreground/40 border border-sidebar-border hover:text-sidebar-foreground hover:border-sidebar-foreground/30'
          }
        `}
      >
        <Moon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Aktifkan Light Mode"
        title="Light Mode"
        className={`
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all duration-200 ease-out
          ${!isDark
            ? 'bg-orange text-orange-foreground shadow-sm scale-105'
            : 'bg-transparent text-sidebar-foreground/40 border border-sidebar-border hover:text-sidebar-foreground hover:border-sidebar-foreground/30'
          }
        `}
      >
        <Sun className="h-4 w-4" />
      </button>
    </div>
  );
}
