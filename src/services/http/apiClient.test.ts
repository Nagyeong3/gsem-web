import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from './apiClient';

describe('API Client', () => {
  it('기준 경로와 Query Parameter를 조합한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 1000, fetcher });
    const params = new URLSearchParams({ page: '1', size: '5' });

    await expect(client.get('/items', params)).resolves.toEqual({ data: { ok: true } });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/items?page=1&size=5',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('서버 오류 응답을 공통 오류로 변환한다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 'ITEM_NOT_FOUND', message: '품목이 없습니다.' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 1000, fetcher });

    await expect(client.get('/items/1')).rejects.toEqual(
      new ApiClientError('품목이 없습니다.', 404, 'ITEM_NOT_FOUND'),
    );
  });
});
