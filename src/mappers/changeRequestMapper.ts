import type { ChangeEventDto } from '../types/api';
import type { ChangeRequest, ChangeRequestStatus } from '../types/domain';
import { toManager } from './managerMapper';

const changeStatusMap: Record<ChangeEventDto['status'], ChangeRequestStatus> = {
  RECEIVED: '접수',
  IN_REVIEW: '검토 중',
  PROCESSED: '처리 완료',
};

function toDisplayDateTime(value: string) {
  return value.replace('T', ' ').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 16);
}

export function toChangeRequest(dto: ChangeEventDto): ChangeRequest {
  return {
    changeId: dto.changeId,
    itemId: dto.item.itemId,
    itemNum: dto.item.itemNumber,
    itemName: dto.item.itemName,
    changeType: dto.changeType,
    requestedBy: toManager(dto.requestedBy),
    requestedAt: toDisplayDateTime(dto.requestedAt),
    processedBy: dto.processedBy ? toManager(dto.processedBy) : undefined,
    processedAt: dto.processedAt ? toDisplayDateTime(dto.processedAt) : undefined,
    status: changeStatusMap[dto.status],
    reason: dto.reason,
    basis: dto.basis,
    differences: dto.differences.map((difference) => ({ ...difference })),
  };
}
