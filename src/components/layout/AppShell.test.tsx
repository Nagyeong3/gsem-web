import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { APP_VERSION } from '../../config/appVersion';
import { createAppTheme } from '../../theme/theme';
import { ThemeModeContext } from '../../theme/themeModeContext';
import { getReleaseEntries } from '../../features/release-history/releases';
import { AppShell } from './AppShell';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('사이드바의 버전 표시에서 패널을 열고 닫는다', async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  render(
    <MemoryRouter>
      <ThemeModeContext.Provider value={{ mode: 'light', toggleMode: vi.fn() }}>
        <ThemeProvider theme={createAppTheme('light')}>
          <AppShell>본문</AppShell>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </MemoryRouter>,
  );
  fireEvent.click(within(screen.getByRole('note')).getByRole('button', { name: '버전 변경 이력' }));
  const panel = screen.getByRole('dialog', { name: '버전 변경 이력' });
  expect(within(panel).getByText(`현재 버전 ${APP_VERSION}`)).toBeVisible();
  fireEvent.click(within(panel).getByRole('button', { name: '버전 변경 이력 닫기' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('운영 빌드에서도 현재 릴리스와 이전 버전의 변경사항을 제공한다', () => {
  const entries = getReleaseEntries('production');
  expect(entries[0].version).toBe(APP_VERSION);
  expect(entries[0].changes.map(change => change.keyword)).toContain('하위 장비 표 KAI 품번');
  expect(entries.some(entry => entry.version === 'v0.25.0')).toBe(true);
  expect(entries.every(entry => !entry.verification)).toBe(true);
  expect(getReleaseEntries('development')[0].verification).toBeTruthy();
});
