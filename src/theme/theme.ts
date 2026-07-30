import { createTheme } from '@mui/material/styles';

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

export const theme = createTheme({
  layout: {
    sidebarWidth: 176,
    headerHeight: 58,
    contentPadding: 24,
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#0867F2',
      dark: '#0759D3',
      light: '#EEF5FF',
    },
    background: {
      default: '#F7F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0B1B3D',
      secondary: '#66758C',
    },
    divider: '#D9E2EC',
    success: { main: '#159A55', light: '#ECF9F1' },
    warning: { main: '#E87500', light: '#FFF5E9' },
    error: { main: '#E52B36', light: '#FFF0F1' },
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
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 36, borderRadius: 5 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { minHeight: 38, borderRadius: 5, backgroundColor: '#FFFFFF' },
        input: { paddingTop: 9, paddingBottom: 9, fontSize: 13 },
        notchedOutline: { borderColor: '#C8D3E0' },
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
          color: '#52647D',
          fontSize: 12,
          fontWeight: 700,
          borderColor: '#D9E2EC',
          whiteSpace: 'nowrap',
        },
        body: {
          height: 48,
          padding: '8px 10px',
          color: '#273A59',
          fontSize: 12,
          borderColor: '#E8EDF3',
          whiteSpace: 'nowrap',
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
