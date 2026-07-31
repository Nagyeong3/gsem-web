import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    layout: {
      sidebarWidth: number;
      headerHeight: number;
      contentPadding: number;
    };
  }

  interface ThemeOptions {
    layout?: {
      sidebarWidth?: number;
      headerHeight?: number;
      contentPadding?: number;
    };
  }
}

export const createAppTheme = (mode: PaletteMode) => {
  const dark = mode === 'dark';
  const colors = {
    background: dark ? '#111A27' : '#F7F9FC',
    paper: dark ? '#182333' : '#FFFFFF',
    textPrimary: dark ? '#EDF3FA' : '#0B1B3D',
    textSecondary: dark ? '#AAB8CA' : '#66758C',
    divider: dark ? '#2C3A4D' : '#D9E2EC',
    subtleDivider: dark ? '#243244' : '#E8EDF3',
    field: dark ? '#141F2D' : '#FFFFFF',
    tableHead: dark ? '#1C293A' : '#F8FAFD',
  };

  return createTheme({
    layout: {
      sidebarWidth: 176,
      headerHeight: 58,
      contentPadding: 24,
    },
    palette: {
      mode,
      primary: {
        main: dark ? '#6CA8FF' : '#0867F2',
        dark: dark ? '#4A8FEF' : '#0759D3',
        light: dark ? '#1D385D' : '#EEF5FF',
      },
      background: {
        default: colors.background,
        paper: colors.paper,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
      },
      divider: colors.divider,
      success: { main: dark ? '#57C987' : '#159A55', light: dark ? '#173C2A' : '#ECF9F1' },
      warning: { main: dark ? '#FFAD55' : '#E87500', light: dark ? '#4A3019' : '#FFF5E9' },
      error: { main: dark ? '#FF747D' : '#E52B36', light: dark ? '#4B2228' : '#FFF0F1' },
    },
    shape: {
      borderRadius: 6,
    },
    typography: {
      fontFamily:
        '"Noto Sans KR Variable", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      h1: { fontSize: 26, lineHeight: 1.38, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: 16, lineHeight: 1.5, fontWeight: 700 },
      body1: { fontSize: 13, lineHeight: 1.55 },
      body2: { fontSize: 12, lineHeight: 1.5 },
      button: { fontSize: 13, fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': { colorScheme: mode },
          body: { transition: 'background-color 180ms ease, color 180ms ease' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 36, borderRadius: 5 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            transition: 'background-color 180ms ease, border-color 180ms ease',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 38,
            borderRadius: 5,
            backgroundColor: colors.field,
          },
          input: { paddingTop: 9, paddingBottom: 9, fontSize: 13 },
          notchedOutline: { borderColor: dark ? '#405169' : '#C8D3E0' },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: { paddingTop: 8, paddingBottom: 8, fontSize: 13 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            height: 42,
            padding: '8px 10px',
            color: dark ? '#B7C5D7' : '#52647D',
            backgroundColor: colors.tableHead,
            fontSize: 12,
            fontWeight: 700,
            borderColor: colors.divider,
            whiteSpace: 'nowrap',
          },
          body: {
            height: 48,
            padding: '8px 10px',
            color: colors.textPrimary,
            fontSize: 12,
            borderColor: colors.subtleDivider,
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: alpha(dark ? '#FFFFFF' : '#0867F2', dark ? 0.045 : 0.035),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { height: 24, borderRadius: 12, fontSize: 11, fontWeight: 600 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: 11 },
        },
      },
    },
  });
};
