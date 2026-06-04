import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
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

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="w-8 h-8 p-0 flex items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="w-full gap-2 justify-start px-3 py-2 h-9 text-sm font-medium text-sidebar-foreground bg-transparent border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </Button>
  );
}
