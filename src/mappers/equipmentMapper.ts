import type {
  ItemDetailDto,
  ItemFilterOptionsDto,
  ItemSummaryDto,
} from '../types/api';
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentStatus,
} from '../types/domain';
import { toManager } from './managerMapper';

const statusMap: Record<ItemSummaryDto['status'], EquipmentStatus> = {
  IN_USE: '사용 중',
  REPLACEMENT_REVIEW: '대체 검토',
  ON_HOLD: '보류',
};

const itemTypeMap = {
  SUPPORT_EQUIPMENT: '지원장비',
  BASIC_ISSUE_ITEM: '기본불출품목',
  FLIGHT_GEAR_INSPECTION_EQUIPMENT: '조종장구류 점검장비',
  STANDARD: '표준기',
} as const;

function toSummaryApplications(dto: ItemSummaryDto): Equipment['applications'] {
  const length = Math.max(dto.businesses.length, dto.aircraftTypes.length, dto.destinations.length);
  return Array.from({ length }, (_, index) => ({
    integratedId: -(index + 1),
    business: dto.businesses[index]?.name ?? dto.businesses[0]?.name ?? '-',
    aircraftType: dto.aircraftTypes[index]?.name ?? dto.aircraftTypes[0]?.name ?? '-',
    deliveries: dto.destinations[index]
      ? [
          {
            id: -(index + 1),
            destination: dto.destinations[index].name,
            quantity: 0,
            deliveryDate: '-',
            status: '예정',
          },
        ]
      : [],
  }));
}

export function toEquipmentSummary(dto: ItemSummaryDto): Equipment {
  return {
    itemId: dto.itemId,
    itemNum: dto.itemNumber,
    itemNameKor: dto.itemNameKor,
    itemNameEng: dto.itemNameEng ?? '',
    itemUsageKor: '',
    itemUsageEng: '',
    category: dto.category,
    manufacturer: dto.vendor?.name ?? '-',
    systems: dto.subsystems,
    maintenanceLevels: dto.maintenanceLevels,
    applications: toSummaryApplications(dto),
    managers: dto.managers.map(toManager),
    status: statusMap[dto.status],
    recentChangeDate: dto.recentChangeDate ?? '-',
  };
}

export function toEquipmentDetail(dto: ItemDetailDto): Equipment {
  return {
    ...toEquipmentSummary(dto),
    itemUsageKor: dto.itemUsageKor ?? '',
    itemUsageEng: dto.itemUsageEng ?? '',
    applications: dto.applications.map((application) => ({
      integratedId: application.integratedInfoId,
      business: application.business.name,
      aircraftType: application.aircraftType.name,
      deliveries: application.deliveries.map((delivery) => ({
        id: delivery.deliveryId,
        destination: delivery.destination.name,
        quantity: delivery.quantity,
        deliveryDate: delivery.deliveryDate,
        receiptDate: delivery.receiptDate,
        status:
          delivery.status === 'PLANNED'
            ? '예정'
            : delivery.status === 'IN_PROGRESS'
              ? '진행'
              : '완료',
      })),
    })),
    itemType: dto.itemType ? itemTypeMap[dto.itemType] : undefined,
    serd: dto.serd,
    qualityAssuranceType: dto.qualityAssuranceType,
    calibration: dto.calibration
      ? {
          required: dto.calibration.required,
          cycleMonths: dto.calibration.cycleMonths,
          method:
            dto.calibration.method === 'IN_HOUSE'
              ? '사내'
              : dto.calibration.method === 'OUTSOURCED'
                ? '사외'
                : undefined,
          provider: dto.calibration.calibrationProvider,
        }
      : undefined,
    replacementSummary: dto.replacementSummary,
  };
}

export function toEquipmentFilterOptions(dto: ItemFilterOptionsDto): EquipmentFilterOptions {
  return {
    aircraftTypes: dto.aircraftTypes.map((item) => item.name),
    businesses: dto.businesses.map((item) => item.name),
    systems: dto.subsystems.map((item) => item.name),
    categories: dto.categories.map((item) => item.name),
    managers: dto.managers.map((item) => item.name),
    destinations: dto.destinations.map((item) => item.name),
    statuses: dto.statuses.map((item) => statusMap[item.value]),
  };
}
