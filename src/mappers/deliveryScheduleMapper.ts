import type { DeliveryScheduleDto } from '../types/api';
import type { DeliverySchedule, DeliveryStatus } from '../types/domain';
import { toManager } from './managerMapper';

const deliveryStatusMap: Record<DeliveryScheduleDto['status'], DeliveryStatus> = {
  PLANNED: '예정',
  IN_PROGRESS: '진행',
  COMPLETED: '완료',
};

export function toDeliverySchedule(dto: DeliveryScheduleDto): DeliverySchedule {
  return {
    deliveryId: dto.deliveryId,
    itemId: dto.item.itemId,
    itemNum: dto.item.itemNumber,
    itemName: dto.item.itemName,
    business: dto.business.name,
    aircraftType: dto.aircraftType.name,
    destination: dto.destination.name,
    plannedQuantity: dto.plannedQuantity ?? dto.quantity ?? 0,
    orderedQuantity: dto.orderedQuantity,
    receivedQuantity: dto.receivedQuantity,
    deliveredQuantity: dto.deliveredQuantity,
    deliveryDate: dto.deliveryDate,
    receiptDate: dto.receiptDate,
    status: deliveryStatusMap[dto.status],
    delayed: dto.delayed,
    managers: dto.managers.map(toManager),
  };
}
