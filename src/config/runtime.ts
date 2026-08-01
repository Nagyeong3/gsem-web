export type DataSource = 'mock' | 'api';

function getDevelopmentOverride(): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('__gsemDataSource');
}

function getDataSource(value: string | undefined, mode: string): DataSource {
  return value === 'api' || mode === 'api' || getDevelopmentOverride() === 'api' ? 'api' : 'mock';
}

export const runtimeConfig = {
  dataSource: getDataSource(import.meta.env.VITE_DATA_SOURCE, import.meta.env.MODE),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, ''),
  apiTimeoutMs: 10_000,
} as const;
