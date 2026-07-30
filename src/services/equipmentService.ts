import { equipmentFixtures } from '../mocks/equipment';
import type { Equipment } from '../types/domain';

export interface EquipmentService {
  getAll(): Promise<Equipment[]>;
  getById(itemId: number): Promise<Equipment | undefined>;
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const mockEquipmentService: EquipmentService = {
  async getAll() {
    await delay(180);
    return structuredClone(equipmentFixtures);
  },
  async getById(itemId) {
    await delay(120);
    const equipment = equipmentFixtures.find((item) => item.itemId === itemId);
    return equipment ? structuredClone(equipment) : undefined;
  },
};
