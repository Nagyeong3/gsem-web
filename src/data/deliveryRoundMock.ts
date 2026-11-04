/**
 * Synthetic delivery-round records for local UI review only.
 * They are not copied from the company database and must never be used for actual reporting.
 */
export const mockBusinesses = [
  { businessId: 101, businessName: '고정익 시연사업 A' },
  { businessId: 102, businessName: '회전익 시연사업 B' },
  { businessId: 103, businessName: '회전익 시연사업 C' },
];

export const mockRounds = [
  { subContractId: 1001, businessId: 101, businessName: '고정익 시연사업 A', destination: '시연 납품부대 1', subContractName: '1차', deliveryDate: '2026-08-15', itemCount: 2, lineCount: 3 },
  { subContractId: 1002, businessId: 101, businessName: '고정익 시연사업 A', destination: '시연 납품부대 2', subContractName: '2차', deliveryDate: '2026-12-15', itemCount: 2, lineCount: 2 },
  { subContractId: 1003, businessId: 102, businessName: '회전익 시연사업 B', destination: '시연 납품부대 3', subContractName: '1차', deliveryDate: '2026-09-30', itemCount: 2, lineCount: 2 },
  { subContractId: 1004, businessId: 102, businessName: '회전익 시연사업 B', destination: '시연 납품부대 4', subContractName: '2차', deliveryDate: '2027-03-31', itemCount: 1, lineCount: 1 },
  { subContractId: 1005, businessId: 103, businessName: '회전익 시연사업 C', destination: '시연 납품부대 5', subContractName: '1차', deliveryDate: '2027-05-31', itemCount: 2, lineCount: 2 },
];

type MockItem = {
  matchId: number; itemId: number; itemNumber: string; itemName: string;
  quantity: number; receivingExpected: string | null; receivedAt: string | null;
  deliveredAt: string | null; vendorName: string; buyerName: string;
};
const item = (matchId: number, itemId: number, itemNumber: string, itemName: string,
  quantity: number, receivedAt: string | null, deliveredAt: string | null): MockItem => ({
  matchId, itemId, itemNumber, itemName, quantity,
  receivingExpected: '2026-08-01', receivedAt, deliveredAt,
  vendorName: '시연용 공급사', buyerName: '시연 담당자',
});
export const mockRoundItems: Record<number, MockItem[]> = {
  1001: [item(1, 1, 'DEMO-A01', '점검 공구 세트', 2, '2026-08-01', '2026-08-12'), item(2, 2, 'DEMO-A02', '전원 시험장치', 1, '2026-08-02', '2026-08-12'), item(3, 1, 'DEMO-A01', '점검 공구 세트', 1, '2026-08-03', '2026-08-12')],
  1002: [item(4, 3, 'DEMO-A03', '정비용 리프트', 1, null, null), item(5, 4, 'DEMO-A04', '케이블 점검장치', 3, null, null)],
  1003: [item(6, 5, 'DEMO-B01', '유압 시험장치', 2, '2026-09-10', '2026-09-28'), item(7, 6, 'DEMO-B02', '회전익 공구함', 1, '2026-09-11', '2026-09-28')],
  1004: [item(8, 7, 'DEMO-B03', '견인 연결장치', 1, null, null)],
  1005: [item(9, 8, 'DEMO-C01', '휴대형 계측기', 2, null, null), item(10, 9, 'DEMO-C02', '정비 지그', 1, null, null)],
};
