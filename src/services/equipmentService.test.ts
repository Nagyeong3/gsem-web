import { describe, expect, it } from 'vitest';
import { emptyEquipmentFilters } from '../features/equipment-search/equipmentSearch';
import { mockEquipmentService } from './equipmentService';

describe('Mock 장비 Service', () => {
  it('검색·정렬·페이징을 Service 경계에서 처리한다', async () => {
    const result = await mockEquipmentService.search({
      filters: { ...emptyEquipmentFilters, business: '가 사업' },
      sortKey: 'itemNum',
      sortDirection: 'asc',
      page: 1,
      size: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalElements).toBeGreaterThan(2);
    expect(result.totalPages).toBeGreaterThan(1);
    expect(result.items[0]?.itemNum.localeCompare(result.items[1]?.itemNum ?? '')).toBeLessThan(0);
  });
});
