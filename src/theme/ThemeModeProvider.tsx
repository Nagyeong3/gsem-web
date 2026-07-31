import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import type { PaletteMode } from '@mui/material/styles';
import { createAppTheme } from './theme';
import { ThemeModeContext } from './themeModeContext';

const storageKey = 'gsem-color-mode';

const getInitialMode = (): PaletteMode => {
  const savedMode = window.localStorage.getItem(storageKey);
  if (savedMode === 'light' || savedMode === 'dark') return savedMode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const contextValue = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        setMode((current) => {
          const nextMode = current === 'light' ? 'dark' : 'light';
          window.localStorage.setItem(storageKey, nextMode);
          return nextMode;
        });
      },
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
