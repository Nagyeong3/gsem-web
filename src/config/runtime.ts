export type DataSource = 'mock' | 'api';

function getDataSource(value: string | undefined): DataSource {
  return value === 'api' ? 'api' : 'mock';
}

export const runtimeConfig = {
  dataSource: getDataSource(import.meta.env.VITE_DATA_SOURCE),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, ''),
  apiTimeoutMs: 10_000,
} as const;
