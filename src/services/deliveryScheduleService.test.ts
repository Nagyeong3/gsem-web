import { describe, expect, it } from 'vitest';
import { mockDeliveryScheduleService } from './deliveryScheduleService';

const emptyFilters = {
  query: '',
  business: '',
  aircraftType: '',
  destination: '',
  status: '',
};

describe('납품 일정 목업 서비스', () => {
  it('사업과 상태를 함께 필터링한다', async () => {
    const result = await mockDeliveryScheduleService.list({
      ...emptyFilters,
      business: '가 사업',
      status: '진행',
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.business === '가 사업' && item.status === '진행')).toBe(true);
  });

  it('품번과 납지로 통합 검색한다', async () => {
    const byItemNumber = await mockDeliveryScheduleService.list({ ...emptyFilters, query: 'XXXXXX-01' });
    const byDestination = await mockDeliveryScheduleService.list({ ...emptyFilters, query: 'A납지' });

    expect(byItemNumber.every((item) => item.itemNum === 'XXXXXX-01')).toBe(true);
    expect(byDestination.every((item) => item.destination === 'A납지')).toBe(true);
  });
});
