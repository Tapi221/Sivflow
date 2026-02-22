import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  isDark: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);

  const setTheme = (nextTheme: Theme) => {
    // ダークモード廃止: ライトのみ許可
    setThemeState('light');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const updateTheme = () => {
      const dark = false;
      
      setIsDark(dark);

      const root = document.documentElement;
      const body = document.body;

      root.classList.toggle('dark', dark);
      body?.classList.toggle('dark', dark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      root.style.colorScheme = dark ? 'dark' : 'light';
    };

    updateTheme();
    localStorage.setItem('theme', 'light');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
