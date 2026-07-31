import { equipmentFixtures } from '../mocks/equipment';
import {
  filterEquipment,
  getAircraftTypes,
  getBusinesses,
  getDestinations,
  sortEquipment,
} from '../features/equipment-search/equipmentSearch';
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentSearchRequest,
  EquipmentSearchResult,
} from '../types/domain';

export interface EquipmentService {
  search(request: EquipmentSearchRequest): Promise<EquipmentSearchResult>;
  getById(itemId: number): Promise<Equipment | undefined>;
  getFilterOptions(): Promise<EquipmentFilterOptions>;
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const mockEquipmentService: EquipmentService = {
  async search(request) {
    await delay(180);
    const filtered = sortEquipment(
      filterEquipment(equipmentFixtures, request.filters),
      request.sortKey,
      request.sortDirection,
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / request.size));
    const safePage = Math.min(Math.max(1, request.page), totalPages);
    const start = (safePage - 1) * request.size;

    return structuredClone({
      items: filtered.slice(start, start + request.size),
      page: safePage,
      size: request.size,
      totalElements: filtered.length,
      totalPages,
    });
  },
  async getById(itemId) {
    await delay(120);
    const equipment = equipmentFixtures.find((item) => item.itemId === itemId);
    return equipment ? structuredClone(equipment) : undefined;
  },
  async getFilterOptions() {
    await delay(80);
    const options: EquipmentFilterOptions = {
      aircraftTypes: [...new Set(equipmentFixtures.flatMap(getAircraftTypes))].sort(),
      businesses: [...new Set(equipmentFixtures.flatMap(getBusinesses))].sort(),
      systems: [
        ...new Set(equipmentFixtures.flatMap((item) => item.systems.map((system) => system.name))),
      ].sort(),
      categories: [...new Set(equipmentFixtures.map((item) => item.category.name))].sort(),
      managers: [
        ...new Set(equipmentFixtures.flatMap((item) => item.managers.map((manager) => manager.name))),
      ].sort(),
      destinations: [...new Set(equipmentFixtures.flatMap(getDestinations))].sort(),
      statuses: [...new Set(equipmentFixtures.map((item) => item.status))].sort(),
    };
    return structuredClone(options);
  },
};
