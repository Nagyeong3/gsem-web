import { preferenceKey } from '../preferences/pagePreferences';
import type { EquipmentFilterOptions } from '../../types/domain';
import { advancedChoiceFields, advancedTextFields } from './advancedFilters';

export const basicFilterFields = [
  ['aircraftType', '기종', 'aircraftTypes'],
  ['business', '사업', 'businesses'],
  ['system', '계통', 'systems'],
  ['category', '장비 구분', 'categories'],
  ['manager', '담당자', 'managers'],
  ['destination', '주요 납지', 'destinations'],
  ['status', '사용 상태', 'statuses'],
] as const;

export const pendingFilterFields = [
  ['acquisition', '획득구분'], ['origin', '국내/해외'], ['warranty', '품보 형태'],
  ['discontinued', '단종 여부'], ['calibration', '교정정보'], ['leadTime', '조달시간 (LT)'],
] as const;

export type FilterBoxKey = (typeof basicFilterFields | typeof advancedTextFields
  | typeof advancedChoiceFields | typeof pendingFilterFields)[number][0];

export function availableBasicFilters(options: EquipmentFilterOptions) {
  return basicFilterFields.filter(([key, , source]) =>
    !['system', 'category', 'status'].includes(key) || options[source].length > 0);
}

export const availableAdvancedTexts = advancedTextFields;

function storageKey(profile: string) {
  return preferenceKey('equipment-search', `hidden-filters:${encodeURIComponent(profile.trim().toLocaleLowerCase())}`);
}

export function readHiddenFilters(profile: string): FilterBoxKey[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey(profile)) ?? 'null');
    if (Array.isArray(data)) {
      const keys = new Set<string>([...basicFilterFields, ...advancedTextFields, ...advancedChoiceFields, ...pendingFilterFields].map(([key]) => key));
      return [...new Set(data.filter((key): key is FilterBoxKey => typeof key === 'string' && keys.has(key)))];
    }
  } catch { /* 저장된 설정을 읽을 수 없으면 모든 필터를 표시한다. */ }
  return [];
}

export function saveHiddenFilters(profile: string, hidden: FilterBoxKey[]) {
  localStorage.setItem(storageKey(profile), JSON.stringify(hidden));
}
