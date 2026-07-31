import { describe, expect, it } from 'vitest';
import type { ItemSummaryDto } from '../types/api';
import { toEquipmentSummary } from './equipmentMapper';

const summary: ItemSummaryDto = {
  itemId: 1,
  itemNumber: 'XXXXXX-01',
  itemNameKor: 'A장비',
  category: { code: 'CA0001', name: '시험장비' },
  aircraftTypes: [{ code: 'AT001', name: 'A기종' }],
  businesses: [
    { businessId: 1, name: '가 사업' },
    { businessId: 2, name: '나 사업' },
  ],
  subsystems: [{ code: 'SS0001', name: '구동계통' }],
  maintenanceLevels: [{ code: 'LO0001', name: '부대' }],
  managers: [{ userId: 1, name: '김책임' }],
  destinations: [{ destinationId: 1, name: 'A납지' }],
  status: 'IN_USE',
};

describe('장비 DTO 변환', () => {
  it('Nullable 담당자 속성과 복수 사업을 안전하게 화면 모델로 변환한다', () => {
    const result = toEquipmentSummary(summary);

    expect(result.applications.map((item) => item.business)).toEqual(['가 사업', '나 사업']);
    expect(result.managers[0]).toEqual({
      id: 1,
      name: '김책임',
      role: undefined,
      assignmentType: undefined,
    });
    expect(result.status).toBe('사용 중');
    expect(result.applications[0]?.deliveries[0]?.destination).toBe('A납지');
  });

  it('업체와 최근 변경일이 없으면 화면용 기본값을 사용한다', () => {
    const result = toEquipmentSummary(summary);
    expect(result.manufacturer).toBe('-');
    expect(result.recentChangeDate).toBe('-');
  });
});
