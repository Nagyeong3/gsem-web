import { equipmentFixtures } from '../mocks/equipment';
import type { DeliverySchedule, DeliveryScheduleFilters } from '../types/domain';

export interface DeliveryScheduleService {
  list(filters: DeliveryScheduleFilters): Promise<DeliverySchedule[]>;
}

const schedules: DeliverySchedule[] = equipmentFixtures.flatMap((equipment) =>
  equipment.applications.flatMap((application) =>
    application.deliveries.map((delivery) => ({
      deliveryId: delivery.id,
      itemId: equipment.itemId,
      itemNum: equipment.itemNum,
      itemName: equipment.itemNameKor,
      business: application.business,
      aircraftType: application.aircraftType,
      destination: delivery.destination,
      plannedQuantity: delivery.quantity,
      orderedQuantity: Math.max(0, delivery.quantity - (delivery.status === '예정' ? 2 : 0)),
      receivedQuantity: delivery.status === '완료' ? delivery.quantity : delivery.status === '진행' ? Math.max(0, delivery.quantity - 3) : 0,
      deliveredQuantity: delivery.status === '완료' ? delivery.quantity : 0,
      deliveryDate: delivery.deliveryDate,
      receiptDate: delivery.receiptDate,
      status: delivery.status,
      delayed: false,
      managers: equipment.managers,
    })),
  ),
);

export const mockDeliveryScheduleService: DeliveryScheduleService = {
  async list(filters) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 140));
    const query = filters.query.trim().toLocaleLowerCase('ko-KR');
    return structuredClone(
      schedules.filter((item) => {
        const matchesQuery =
          !query ||
          [item.itemNum, item.itemName, item.business, item.destination]
            .join(' ')
            .toLocaleLowerCase('ko-KR')
            .includes(query);
        return (
          matchesQuery &&
          (!filters.business || item.business === filters.business) &&
          (!filters.aircraftType || item.aircraftType === filters.aircraftType) &&
          (!filters.destination || item.destination === filters.destination) &&
          (!filters.status || item.status === filters.status)
        );
      }),
    );
  },
};
