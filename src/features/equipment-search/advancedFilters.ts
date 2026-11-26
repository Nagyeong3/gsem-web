import type { Equipment, EquipmentAdvancedFilters } from '../../types/domain';

export const advancedTextFields = [
  ['itemNum', '품번'],
  ['kaiPartNumber', 'KAI 품번'],
  ['itemNameKor', '품명 (국문)'],
  ['itemNameEng', '품명 (영문)'],
  ['itemUsageKor', '용도 (국문)'],
  ['itemUsageEng', '용도 (영문)'],
  ['itemNsn', '재고번호 (NSN)'],
  ['serdNumber', 'SERD 번호'],
] as const;

export type EquipmentSuggestionField = 'query' | typeof advancedTextFields[number][0];

export const advancedChoiceFields = [
  ['subsystems', '계통 (Subsystem)'],
  ['maintenanceLevels', '정비계단 (Level of Maintenance)'],
  ['categories', '장비 구분 (Category)'],
] as const;

export const advancedFilterFields = [...advancedTextFields, ...advancedChoiceFields] as const;
export function readAdvancedFilters(params: URLSearchParams): EquipmentAdvancedFilters {
  const filters: EquipmentAdvancedFilters = {};
  for (const [key] of advancedTextFields) {
    const value = params.get(key)?.trim().slice(0, 200);
    if (value) filters[key] = value;
  }
  for (const [key] of advancedChoiceFields) {
    const values = [...new Set(params.getAll(key).filter(Boolean))].slice(0, 50);
    if (values.length) filters[key] = values;
  }
  return filters;
}

export function matchesAdvancedFilters(item: Equipment, filters: EquipmentAdvancedFilters = {}) {
  const matchesChoice = (key: typeof advancedChoiceFields[number][0], values: string[]) =>
    !filters[key]?.length || filters[key].some(value => values.includes(value));
  const matchesText = (key: typeof advancedTextFields[number][0]) => {
    const value = filters[key]?.trim();
    if (!value) return true;
    const field = key === 'serdNumber' ? item.serd?.serdNumber : item[key];
    return (field ?? '').toLocaleLowerCase().includes(value.toLocaleLowerCase());
  };
  return advancedTextFields.every(([key]) => matchesText(key)) &&
    matchesChoice('subsystems', item.systems.map(code => code.code)) &&
    matchesChoice('maintenanceLevels', item.maintenanceLevels.map(code => code.code)) &&
    matchesChoice('categories', [item.category.code]);
}
