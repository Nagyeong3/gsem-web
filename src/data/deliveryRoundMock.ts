/** Synthetic fixtures; not extracted from a company SQL Server database. */
export type DemoLine = {
  matchId: number; itemId: number; itemNumber: string; itemName: string;
  quantity: number; receivingExpected: string | null; receivedAt: string | null;
  deliveredAt: string | null; vendorName: string; buyerName: string;
  contractPrice: number; purchaseRequestNumber: string | null; purchaseOrderNumber: string | null;
};
export type DemoRound = {
  subContractId: number; businessId: number; businessName: string;
  destination: string; subContractName: string; deliveryDate: string;
  itemCount: number; pointCount: number; prCount: number; poCount: number;
  receivedCount: number; deliveredCount: number;
  deliveryCompleted: boolean; deliveryAmount: number;
};
export const mockBusinesses = [
  { businessId: 101, businessName: '가 사업' },
  { businessId: 102, businessName: '나 사업' },
  { businessId: 103, businessName: '다 사업' },
];

const sampleRounds = [
  { subContractId: 1001, businessId: 101, businessName: '가 사업', destination: '가 부대', subContractName: '1차', deliveryDate: '2026-08-15' },
  { subContractId: 1002, businessId: 101, businessName: '가 사업', destination: '나 부대', subContractName: '2차', deliveryDate: '2026-12-15' },
  { subContractId: 1003, businessId: 102, businessName: '나 사업', destination: '다 부대', subContractName: '1차', deliveryDate: '2026-09-30' },
  { subContractId: 1004, businessId: 102, businessName: '나 사업', destination: '라 부대', subContractName: '2차', deliveryDate: '2027-03-31' },
  { subContractId: 1005, businessId: 103, businessName: '다 사업', destination: '가 부대', subContractName: '1차', deliveryDate: '2027-05-31' },
];

function line(id: number, itemId: number, quantity: number, vendor: string,
  received: string | null, delivered: string | null,
  pr: string | null, po: string | null, price: number): DemoLine {
  return { matchId: id, itemId, itemNumber: `DEMO-${String(itemId).padStart(3, '0')}`,
    itemName: `시연 품목 ${itemId}`, quantity, receivingExpected: '2026-08-01',
    receivedAt: received, deliveredAt: delivered, vendorName: vendor, buyerName: '김책임',
    contractPrice: price, purchaseRequestNumber: pr, purchaseOrderNumber: po };
}
export const mockRoundItems: Record<number, DemoLine[]> = {
  1001: [
    line(1, 1, 2, '가 조달원', '2026-08-01', '2026-08-12', 'PR-1', 'PO-1', 1000),
    line(2, 2, 1, '나 조달원', '2026-08-02', '2026-08-12', 'PR-1', 'PO-1', 2500),
    line(3, 1, 3, '가 조달원', '2026-08-03', '2026-08-12', 'PR-2', null, 1000),
  ],
  1002: [
    line(4, 3, 1, '가 조달원', null, null, 'PR-3', null, 7000),
    line(5, 4, 3, '나 조달원', null, null, null, null, 4500),
  ],
  1003: [
    line(6, 5, 2, '가 조달원', '2026-09-10', '2026-09-28', 'PR-4', 'PO-4', 5500),
    line(7, 6, 1, '나 조달원', '2026-09-11', '2026-09-28', 'PR-5', 'PO-5', 2200),
  ],
  1004: [line(8, 7, 1, '나 조달원', null, null, null, null, 2000)],
  1005: [
    line(9, 8, 2, '가 조달원', null, null, 'PR-6', null, 990),
    line(10, 9, 1, '나 조달원', null, null, null, null, 1800),
  ],
};

export function aggregateDemoLines(lines: DemoLine[]) {
  return {
    itemCount: new Set(lines.map((item) => item.itemId)).size,
    pointCount: lines.reduce((sum, item) => sum + item.quantity, 0),
    prCount: lines.filter((item) => item.purchaseRequestNumber !== null).length,
    poCount: lines.filter((item) => item.purchaseOrderNumber !== null).length,
    receivedCount: lines.filter((item) => item.receivedAt !== null).length,
    deliveredCount: lines.filter((item) => item.deliveredAt !== null).length,
    // Reproduce the SQL expression COUNT(item_id) = COUNT(date_deliver), including empty groups.
    deliveryCompleted: lines.length === lines.filter((item) => item.deliveredAt !== null).length,
    deliveryAmount: lines.reduce((sum, item) => sum + item.quantity * item.contractPrice, 0),
  };
}
export const mockRounds: DemoRound[] = sampleRounds.map((round) => ({
  ...round, ...aggregateDemoLines(mockRoundItems[round.subContractId] ?? []),
}));
