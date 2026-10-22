import { describe, expect, it } from 'vitest';
import { mapDatabaseItem, type DbDelivery, type DbMasterRow } from './model';

const line: DbDelivery = { matchId: 1, subContractId: 1, subContractName: '가 계약', destination: '가 부대', quantity: 3, receivingExpected: null, receivedAt: '2026-01-01', deliveredAt: '2026-01-02', contractDate: '2026-01-03', buyerName: '김책임', vendorName: '가 업체' };
const row: DbMasterRow = { integratedId: 10, itemId: 1, businessId: 2, businessName: '나 사업', itemNumber: 'XXXXXX', itemNameKor: 'A장비', description: null, managerName: null, manufacturer: null, imagePath: null, deliveries: [] };

describe('통합현황 기존 데이터 집계 보존', () => {
  it('중복 matchId는 수량 합계에서 제외하고 날짜가 다르면 상세 확인을 표시한다', () => {
    const item = mapDatabaseItem({ ...row, deliveries: [line, line, { ...line, matchId: 2, quantity: 4, receivedAt: '2026-01-04' }] });
    expect(item.id).toBe('10');
    expect(item.deliveries[0].quantity).toBe(7);
    expect(item.deliveries[0].inboundActual).toBe('다건(상세)');
    expect(item.contractLines).toHaveLength(2);
    expect(item.validationIssues?.join(' ')).toContain('중복 matchId');
  });
  it('미등록 계약과 잘못된 수량은 임의의 업무 값으로 채우지 않는다', () => {
    expect(mapDatabaseItem(row).validationIssues).toContain('계약·납품 데이터 미등록');
    const item = mapDatabaseItem({ ...row, deliveries: [{ ...line, quantity: -2, destination: null }] });
    expect(item.deliveries[0].quantity).toBe(0);
    expect(item.deliveries[0].unitName).toBe('납지미지정');
    expect(item.validationIssues).toHaveLength(2);
  });
});
