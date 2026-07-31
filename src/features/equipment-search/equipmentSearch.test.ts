import { describe, expect, it } from 'vitest';
import { equipmentFixtures } from '../../mocks/equipment';
import {
  emptyEquipmentFilters,
  filterEquipment,
  sortEquipment,
  summarize,
  summarizeManagers,
} from './equipmentSearch';

describe('장비 검색', () => {
  it('품번과 품명, 용도를 부분 일치로 검색한다', () => {
    const byNumber = filterEquipment(equipmentFixtures, {
      ...emptyEquipmentFilters,
      query: 'XXXXXX-01',
    });
    const byName = filterEquipment(equipmentFixtures, {
      ...emptyEquipmentFilters,
      query: 'A장비',
    });
    const byUsage = filterEquipment(equipmentFixtures, {
      ...emptyEquipmentFilters,
      query: '기준 측정',
    });

    expect(byNumber).toHaveLength(1);
    expect(byName[0]?.itemNum).toBe('XXXXXX-01');
    expect(byUsage[0]?.itemNameKor).toBe('J장비');
  });

  it('복수 사업과 복수 계통을 포함해 조건을 조합한다', () => {
    const result = filterEquipment(equipmentFixtures, {
      ...emptyEquipmentFilters,
      business: '나 사업',
      system: '전기계통',
    });

    expect(result.map((item) => item.itemNameKor)).toEqual(['A장비', 'C장비']);
  });

  it('품목당 한 행을 유지한다', () => {
    const result = filterEquipment(equipmentFixtures, {
      ...emptyEquipmentFilters,
      business: '가 사업',
    });

    expect(new Set(result.map((item) => item.itemId)).size).toBe(result.length);
  });

  it('정담당자를 우선하여 복수 담당자를 요약한다', () => {
    expect(summarizeManagers(equipmentFixtures[0])).toBe('김책임 외 1명');
    expect(summarize(['가 사업', '나 사업'])).toBe('가 사업 외 1개');
  });

  it('최근 변경일 기준으로 정렬한다', () => {
    const result = sortEquipment(equipmentFixtures, 'recentChangeDate', 'desc');
    expect(result[0]?.itemNum).toBe('XXXXXX-01');
  });
});
