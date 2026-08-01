import { describe, expect, it } from 'vitest';
import type { ItemDetailDto, ItemSummaryDto } from '../types/api';
import { toEquipmentDetail, toEquipmentSummary } from './equipmentMapper';

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

  it('통합 상세의 품목 유형과 SERD·교정·대체 관계를 보존한다', () => {
    const detail: ItemDetailDto = {
      ...summary,
      itemType: 'SUPPORT_EQUIPMENT',
      applications: [],
      serd: { serdNumber: 'XXXXXX' },
      qualityAssuranceType: { code: 'QA0001', name: '표준 1형' },
      calibration: { required: true, cycleMonths: 12, method: 'OUTSOURCED' },
      replacementSummary: { predecessors: 1, successors: 2, hasBranch: true },
    };

    const result = toEquipmentDetail(detail);

    expect(result.itemType).toBe('지원장비');
    expect(result.serd?.serdNumber).toBe('XXXXXX');
    expect(result.calibration).toMatchObject({ required: true, cycleMonths: 12, method: '사외' });
    expect(result.replacementSummary).toEqual({ predecessors: 1, successors: 2, hasBranch: true });
  });
});
