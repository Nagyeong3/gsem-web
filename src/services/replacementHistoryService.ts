import type { ReplacementGraph } from '../types/domain';

const graph: ReplacementGraph = {
  items: [
    { id: 'a', itemNum: 'XXXXXX-01', itemName: 'A장비', businesses: ['가 사업'], status: '단종', depth: 1, position: { x: 20, y: 180 } },
    { id: 'a1', itemNum: 'XXXXXX-02', itemName: 'A-1장비', businesses: ['가 사업', '나 사업'], status: '단종', depth: 2, position: { x: 240, y: 80 } },
    { id: 'b', itemNum: 'XXXXXX-06', itemName: 'B장비', businesses: ['나 사업'], status: '단종', depth: 2, position: { x: 240, y: 300 } },
    { id: 'a2', itemNum: 'XXXXXX-03', itemName: 'A-2장비', businesses: ['가 사업', '나 사업'], status: '사용 중', depth: 3, position: { x: 460, y: 30 } },
    { id: 'c', itemNum: 'XXXXXX-07', itemName: 'C장비', businesses: ['가 사업', '다 사업'], status: '단종', depth: 3, position: { x: 460, y: 250 } },
    { id: 'a3', itemNum: 'XXXXXX-04', itemName: 'A-3장비', businesses: ['나 사업', '다 사업'], status: '단종', depth: 4, position: { x: 680, y: 0 } },
    { id: 'b1', itemNum: 'XXXXXX-08', itemName: 'B-1장비', businesses: ['가 사업'], status: '단종', depth: 4, position: { x: 680, y: 175 } },
    { id: 'c1', itemNum: 'XXXXXX-09', itemName: 'C-1장비', businesses: ['다 사업'], status: '단종', depth: 4, position: { x: 680, y: 330 } },
    { id: 'a4', itemNum: 'XXXXXX-05', itemName: 'A-4장비', businesses: ['다 사업'], status: '사용 중', depth: 5, position: { x: 900, y: 0 } },
    { id: 'b2', itemNum: 'XXXXXX-10', itemName: 'B-2장비', businesses: ['나 사업'], status: '대체 예정', depth: 5, position: { x: 900, y: 135 } },
    { id: 'c2', itemNum: 'XXXXXX-11', itemName: 'C-2장비', businesses: ['가 사업', '다 사업'], status: '사용 중', depth: 5, position: { x: 900, y: 250 } },
    { id: 'd', itemNum: 'XXXXXX-12', itemName: 'D장비', businesses: ['가 사업'], status: '단종', depth: 5, position: { x: 900, y: 370 } },
  ],
  relations: [
    ['r1', 'a', 'a1'], ['r2', 'a', 'b'], ['r3', 'a1', 'a2'], ['r4', 'a1', 'c'],
    ['r5', 'b', 'c'], ['r6', 'a2', 'a3'], ['r7', 'a2', 'b1'], ['r8', 'c', 'c1'],
    ['r9', 'a3', 'a4'], ['r10', 'a3', 'b2'], ['r11', 'b1', 'c2'], ['r12', 'c1', 'd'],
  ].map(([id, source, target], index) => ({
    id,
    source,
    target,
    changeId: `CHG-${String(index + 1).padStart(5, '0')}`,
    changedAt: `2026-0${Math.min(index + 1, 9)}-15`,
    changeType: '단종 대체',
    reason: `${source.toUpperCase()}장비 단종에 따른 대체품 적용`,
    requester: { id: 1, name: '김책임', role: '지원장비 담당자' },
    processor: { id: 2, name: '이선임', role: '구매 담당자' },
  })),
};

export const replacementHistoryService = {
  async getGraph(): Promise<ReplacementGraph> {
    return structuredClone(graph);
  },
};
