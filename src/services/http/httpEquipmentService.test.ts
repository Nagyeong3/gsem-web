import { describe, expect, it, vi } from 'vitest';
import { emptyEquipmentFilters } from '../../features/equipment-search/equipmentSearch';
import { ApiClient } from './apiClient';
import { createHttpEquipmentService } from './httpEquipmentService';

describe('HTTP 장비 Service', () => {
  it('검색 결과가 비어도 화면 페이지 번호를 1 이상으로 정규화한다', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/items/filter-options')) {
        return new Response(
          JSON.stringify({
            data: {
              itemTypes: [],
              aircraftTypes: [],
              businesses: [],
              subsystems: [],
              categories: [],
              managers: [],
              destinations: [],
              statuses: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          data: [],
          page: { page: 1, size: 10, totalElements: 0, totalPages: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const service = createHttpEquipmentService(
      new ApiClient({
        baseUrl: '/api/v1',
        timeoutMs: 1_000,
        fetcher: fetcher as typeof fetch,
      }),
    );

    const result = await service.search({
      filters: emptyEquipmentFilters,
      sortKey: 'recentChangeDate',
      sortDirection: 'desc',
      page: 1,
      size: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
