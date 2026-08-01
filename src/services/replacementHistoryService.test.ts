import { describe, expect, it } from 'vitest';
import { mockReplacementHistoryService } from './replacementHistoryService';

describe('장비 대체 이력 목업 서비스', () => {
  it('5단계와 분기 관계를 반환한다', async () => {
    const graph = await mockReplacementHistoryService.getGraph();
    expect(Math.max(...graph.items.map((item) => item.depth))).toBe(5);
    expect(graph.relations.filter((item) => item.source === 'a').length).toBeGreaterThan(1);
  });

  it('품목별 복수 사업과 일반화된 담당자 정보를 유지한다', async () => {
    const graph = await mockReplacementHistoryService.getGraph();
    expect(graph.items.some((item) => item.businesses.length > 1)).toBe(true);
    expect(graph.relations.every((item) => ['김책임', '이선임'].includes(item.requester.name) && ['김책임', '이선임'].includes(item.processor.name))).toBe(true);
  });
});
