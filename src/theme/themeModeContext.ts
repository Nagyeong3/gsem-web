import { createContext, useContext } from 'react';
import type { PaletteMode } from '@mui/material/styles';

export interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode는 ThemeModeProvider 안에서 사용해야 합니다.');
  return context;
}
