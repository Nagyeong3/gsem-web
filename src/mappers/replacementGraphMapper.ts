import type { ManagerAssignmentDto, ReplacementGraphDto } from '../types/api';
import type { ReplacementGraph, ReplacementStatus } from '../types/domain';
import { toManager } from './managerMapper';

const fallbackRequester: ManagerAssignmentDto = {
  userId: 0,
  name: '-',
};

const fallbackProcessor: ManagerAssignmentDto = {
  userId: 0,
  name: '-',
};

function toStatus(status: string): ReplacementStatus {
  if (status === 'IN_USE' || status === '사용 중') return '사용 중';
  if (status === 'DISCONTINUED' || status === '단종') return '단종';
  return '대체 예정';
}

function calculateDepths(dto: ReplacementGraphDto) {
  const depths = new Map<number, number>([[dto.rootItemId, 1]]);
  // 대체 계보는 순환이 없는 방향 그래프를 전제로 하되, 잘못된 응답이 와도 무한 반복하지 않는다.
  for (let pass = 0; pass < dto.nodes.length; pass += 1) {
    let changed = false;
    for (const edge of dto.edges) {
      const sourceDepth = depths.get(edge.sourceItemId);
      if (!sourceDepth) continue;
      const nextDepth = sourceDepth + 1;
      if ((depths.get(edge.targetItemId) ?? 0) < nextDepth) {
        depths.set(edge.targetItemId, nextDepth);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return depths;
}

export function toReplacementGraph(dto: ReplacementGraphDto): ReplacementGraph {
  const depths = calculateDepths(dto);
  const rowByDepth = new Map<number, number>();
  const nodesById = new Map(dto.nodes.map((node) => [node.itemId, node]));

  return {
    items: dto.nodes.map((node) => {
      const depth = depths.get(node.itemId) ?? 1;
      const row = rowByDepth.get(depth) ?? 0;
      rowByDepth.set(depth, row + 1);
      return {
        id: String(node.itemId),
        itemNum: node.itemNumber,
        itemName: node.itemName,
        businesses: [...node.businesses],
        status: toStatus(node.status),
        depth,
        position: { x: 20 + (depth - 1) * 220, y: row * 145 },
      };
    }),
    relations: dto.edges.map((edge) => ({
      id: edge.relationId,
      source: String(edge.sourceItemId),
      target: String(edge.targetItemId),
      changeId: edge.changeId ?? edge.relationId,
      changedAt: edge.changedAt ?? edge.effectiveFrom ?? '-',
      changeType: edge.changeType ?? '단종 대체',
      reason:
        edge.reason ??
        `${nodesById.get(edge.sourceItemId)?.itemName ?? '기존 장비'} 단종에 따른 대체품 적용`,
      requester: toManager(edge.requestedBy ?? fallbackRequester),
      processor: toManager(edge.processedBy ?? fallbackProcessor),
    })),
  };
}
