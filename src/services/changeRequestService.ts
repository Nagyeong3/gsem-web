import type { ChangeRequest, ChangeRequestFilters } from '../types/domain';

const changeRequests: ChangeRequest[] = [
  {
    changeId: 'CHG-XXXXX-01', itemId: 1, itemNum: 'XXXXXX-01', itemName: 'A장비',
    changeType: '담당자 변경', requestedBy: { id: 1, name: '김책임' }, requestedAt: '2026-07-29 09:20',
    processedBy: { id: 2, name: '이선임' }, processedAt: '2026-07-30 14:10', status: '처리 완료',
    reason: '담당 업무 조정', basis: '담당자 확인',
    differences: [{ field: 'manager', label: '지원장비 담당자', before: '이선임', after: '김책임' }],
  },
  {
    changeId: 'CHG-XXXXX-02', itemId: 2, itemNum: 'XXXXXX-02', itemName: 'B장비',
    changeType: '품목 정보 변경', requestedBy: { id: 3, name: '박책임' }, requestedAt: '2026-07-28 10:05',
    processedBy: { id: 2, name: '이선임' }, status: '검토 중', reason: '품목 용도 정보 보완', basis: '검토 자료 확인',
    differences: [{ field: 'usage', label: '국문 용도', before: '변경 전 용도', after: '변경 후 용도' }],
  },
  {
    changeId: 'CHG-XXXXX-03', itemId: 3, itemNum: 'XXXXXX-03', itemName: 'C장비',
    changeType: '대체품 검토', requestedBy: { id: 4, name: '최선임' }, requestedAt: '2026-07-27 15:30',
    status: '접수', reason: '단종 여부 확인 후 대체품 검토 필요', basis: '단종 확인',
    differences: [{ field: 'replacement', label: '대체품', before: '미지정', after: '검토 중' }],
  },
  {
    changeId: 'CHG-XXXXX-04', itemId: 4, itemNum: 'XXXXXX-04', itemName: 'D장비',
    changeType: '장비 구분 변경', requestedBy: { id: 1, name: '김책임' }, requestedAt: '2026-07-25 11:00',
    processedBy: { id: 2, name: '이선임' }, processedAt: '2026-07-26 16:20', status: '처리 완료',
    reason: '분류 기준 확인', basis: '분류 정보 확인',
    differences: [{ field: 'category', label: '장비 구분', before: '일반공구', after: '특수공구' }],
  },
];

export interface ChangeRequestService {
  list(filters: ChangeRequestFilters): Promise<ChangeRequest[]>;
  getById(changeId: string): Promise<ChangeRequest | undefined>;
}

export const mockChangeRequestService: ChangeRequestService = {
  async list(filters) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 140));
    const query = filters.query.trim().toLocaleLowerCase('ko-KR');
    return structuredClone(changeRequests.filter((item) => {
      const matchesQuery = !query || [item.changeId, item.itemNum, item.itemName, item.changeType]
        .join(' ').toLocaleLowerCase('ko-KR').includes(query);
      return matchesQuery
        && (!filters.changeType || item.changeType === filters.changeType)
        && (!filters.status || item.status === filters.status)
        && (!filters.requester || item.requestedBy.name === filters.requester);
    }));
  },
  async getById(changeId) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    const result = changeRequests.find((item) => item.changeId === changeId);
    return result ? structuredClone(result) : undefined;
  },
};
