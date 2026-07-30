import type {
  Equipment,
  EquipmentFilters,
  EquipmentSortKey,
  SortDirection,
} from '../../types/domain';

export const emptyEquipmentFilters: EquipmentFilters = {
  query: '',
  aircraftType: '',
  business: '',
  system: '',
  category: '',
  manager: '',
  destination: '',
  status: '',
};

export function getBusinesses(item: Equipment) {
  return [...new Set(item.applications.map((application) => application.business))];
}

export function getAircraftTypes(item: Equipment) {
  return [...new Set(item.applications.map((application) => application.aircraftType))];
}

export function getDestinations(item: Equipment) {
  return [
    ...new Set(
      item.applications.flatMap((application) =>
        application.deliveries.map((delivery) => delivery.destination),
      ),
    ),
  ];
}

export function summarize(values: string[], emptyLabel = '-') {
  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length === 0) return emptyLabel;
  if (uniqueValues.length === 1) return uniqueValues[0];
  return `${uniqueValues[0]} 외 ${uniqueValues.length - 1}개`;
}

export function summarizeManagers(item: Equipment) {
  const primaryManager =
    item.managers.find((manager) => manager.assignmentType === '정') ?? item.managers[0];
  if (!primaryManager) return '-';
  if (item.managers.length === 1) return primaryManager.name;
  return `${primaryManager.name} 외 ${item.managers.length - 1}명`;
}

export function filterEquipment(items: Equipment[], filters: EquipmentFilters) {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');

  return items.filter((item) => {
    const searchableText = [
      item.itemNum,
      item.itemNameKor,
      item.itemNameEng,
      item.itemUsageKor,
      item.itemUsageEng,
    ]
      .join(' ')
      .toLocaleLowerCase('ko-KR');

    return (
      (!query || searchableText.includes(query)) &&
      (!filters.aircraftType || getAircraftTypes(item).includes(filters.aircraftType)) &&
      (!filters.business || getBusinesses(item).includes(filters.business)) &&
      (!filters.system || item.systems.some((system) => system.name === filters.system)) &&
      (!filters.category || item.category.name === filters.category) &&
      (!filters.manager || item.managers.some((manager) => manager.name === filters.manager)) &&
      (!filters.destination || getDestinations(item).includes(filters.destination)) &&
      (!filters.status || item.status === filters.status)
    );
  });
}

function getSortValue(item: Equipment, key: EquipmentSortKey) {
  const valueMap: Record<EquipmentSortKey, string> = {
    itemNum: item.itemNum,
    itemNameKor: item.itemNameKor,
    aircraftType: getAircraftTypes(item)[0] ?? '',
    business: getBusinesses(item)[0] ?? '',
    system: item.systems[0]?.name ?? '',
    category: item.category.name,
    manager: item.managers[0]?.name ?? '',
    destination: getDestinations(item)[0] ?? '',
    status: item.status,
    recentChangeDate: item.recentChangeDate,
  };
  return valueMap[key];
}

export function sortEquipment(
  items: Equipment[],
  key: EquipmentSortKey,
  direction: SortDirection,
) {
  return [...items].sort((left, right) => {
    const comparison = getSortValue(left, key).localeCompare(getSortValue(right, key), 'ko');
    return direction === 'asc' ? comparison : -comparison;
  });
}
