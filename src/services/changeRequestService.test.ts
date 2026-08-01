import { describe, expect, it } from 'vitest';
import { mockChangeRequestService } from './changeRequestService';

const emptyFilters = { query: '', changeType: '', status: '', requester: '' };

describe('변경 신청 목업 서비스', () => {
  it('상태와 신청자를 함께 필터링한다', async () => {
    const result = await mockChangeRequestService.list({ ...emptyFilters, status: '처리 완료', requester: '김책임' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.status === '처리 완료' && item.requestedBy.name === '김책임')).toBe(true);
  });

  it('신청번호와 품번으로 검색한다', async () => {
    expect(await mockChangeRequestService.list({ ...emptyFilters, query: 'CHG-XXXXX-02' })).toHaveLength(1);
    expect(await mockChangeRequestService.list({ ...emptyFilters, query: 'XXXXXX-03' })).toHaveLength(1);
  });
});
