import { describe, expect, it } from 'vitest';
import { toChangeRequest } from './changeRequestMapper';
import { toDeliverySchedule } from './deliveryScheduleMapper';
import { toReplacementGraph } from './replacementGraphMapper';

describe('확장 화면 API Mapper', () => {
  it('납품 수량과 코드값을 화면 모델로 변환한다', () => {
    const result = toDeliverySchedule({
      deliveryId: 1,
      integratedInfoId: 1,
      item: { itemId: 1, itemNumber: 'XXXXXX-01', itemName: 'A장비' },
      business: { businessId: 1, name: '가 사업' },
      aircraftType: { code: 'AT001', name: 'A기종' },
      destination: { code: '1', name: 'A납지' },
      plannedQuantity: 10,
      orderedQuantity: 8,
      receivedQuantity: 5,
      deliveredQuantity: 0,
      deliveryDate: '2026-08-10',
      status: 'IN_PROGRESS',
      managers: [{ userId: 1, name: '김책임', role: 'SUPPORT_EQUIPMENT_MANAGER' }],
    });

    expect(result).toMatchObject({
      itemNum: 'XXXXXX-01',
      plannedQuantity: 10,
      status: '진행',
      managers: [{ name: '김책임', role: '지원장비 담당자' }],
    });
  });

  it('변경 상태와 ISO 일시를 화면 표시 형식으로 변환한다', () => {
    const result = toChangeRequest({
      changeId: 'CHG-XXXXX-01',
      item: { itemId: 1, itemNumber: 'XXXXXX-01', itemName: 'A장비' },
      changeType: '담당자 변경',
      requestedBy: { userId: 1, name: '김책임' },
      requestedAt: '2026-07-29T09:20:00+09:00',
      status: 'IN_REVIEW',
      differences: [],
    });

    expect(result.status).toBe('검토 중');
    expect(result.requestedAt).toBe('2026-07-29 09:20');
  });

  it('대체 관계에서 5단계 깊이와 분기를 계산한다', () => {
    const result = toReplacementGraph({
      rootItemId: 1,
      nodes: Array.from({ length: 6 }, (_, index) => ({
        itemId: index + 1,
        itemNumber: `XXXXXX-0${index + 1}`,
        itemName: `${String.fromCharCode(65 + index)}장비`,
        businesses: ['가 사업'],
        status: index === 5 ? 'IN_USE' : 'DISCONTINUED',
      })),
      edges: [
        { relationId: 'r1', sourceItemId: 1, targetItemId: 2 },
        { relationId: 'r2', sourceItemId: 1, targetItemId: 3 },
        { relationId: 'r3', sourceItemId: 2, targetItemId: 4 },
        { relationId: 'r4', sourceItemId: 4, targetItemId: 5 },
        { relationId: 'r5', sourceItemId: 5, targetItemId: 6 },
      ],
    });

    expect(Math.max(...result.items.map((item) => item.depth))).toBe(5);
    expect(result.relations.filter((relation) => relation.source === '1')).toHaveLength(2);
  });
});
