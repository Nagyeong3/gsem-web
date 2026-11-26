import type { Equipment, EquipmentSortKey } from '../../types/domain';
import { preferenceKey } from '../preferences/pagePreferences';
import { getAircraftTypes, getBusinesses, getDestinations, summarize } from './equipmentSearch';
import { columns } from './searchConfig';

export type ResultColumnKey = EquipmentSortKey | 'image';
export type ResultColumn = { key: ResultColumnKey; label: string; sortKey?: EquipmentSortKey };
export type ColumnLayout = { key: ResultColumnKey; visible: boolean }[];
export type LayoutPreset = { name: string; layout: ColumnLayout };

export const resultColumns: ResultColumn[] = [
  { key: 'image', label: '이미지' },
  ...columns.map(column => ({ ...column, sortKey: column.key })),
  { key: 'kaiPartNumber', sortKey: 'kaiPartNumber', label: 'KAI 품번' },
  { key: 'itemNsn', sortKey: 'itemNsn', label: '재고번호 (NSN)' },
  { key: 'itemNameEng', sortKey: 'itemNameEng', label: '영문 품명' },
  { key: 'manufacturer', sortKey: 'manufacturer', label: '제조사' },
];

export const defaultColumnLayout: ColumnLayout = resultColumns.map(({ key }) => ({
  key, visible: key === 'image' || key === 'kaiPartNumber' || columns.some(column => column.key === key),
}));

export function normalizeLayout(value: unknown): ColumnLayout {
  if (!Array.isArray(value)) return defaultColumnLayout;
  const valid = new Set(defaultColumnLayout.map(column => column.key));
  const known: ColumnLayout = [];
  for (const column of value) {
    if (!column || !valid.delete(column.key) || typeof column.visible !== 'boolean') continue;
    known.push({ key: column.key, visible: column.visible });
  }
  const layout = [...known, ...defaultColumnLayout.filter(column => !known.some(entry => entry.key === column.key))];
  return layout.some(column => column.visible && column.key !== 'image') ? layout : defaultColumnLayout;
}

export function visibleColumns(layout: ColumnLayout): ResultColumn[] {
  return layout.filter(column => column.visible).flatMap(({ key }) => resultColumns.find(column => column.key === key) ?? []);
}

export function resultCell(item: Equipment, key: ResultColumnKey, full = false): string {
  const many = (values: string[]) => full ? [...new Set(values)].join(' · ') || '-' : summarize(values);
  switch (key) {
    case 'kaiPartNumber': return item.kaiPartNumber || '미연결';
    case 'image': return item.imageUrl ? '있음' : '없음';
    case 'aircraftType': return many(getAircraftTypes(item));
    case 'business': return many(getBusinesses(item));
    case 'system': return many(item.systems.map(system => system.name));
    case 'category': return item.category.name;
    case 'manager': return many(item.managers.map(manager => manager.name));
    case 'destination': return many(getDestinations(item));
    default: return item[key] || '-';
  }
}

export function readColumnSettings(profile: string): { layout: ColumnLayout; presets: LayoutPreset[] } {
  try {
    const stored = JSON.parse(localStorage.getItem(layoutStorageKey(profile)) || 'null');
    if (stored) return {
      layout: normalizeLayout(stored.layout),
      presets: Array.isArray(stored.presets) ? stored.presets
        .filter((value: LayoutPreset | null) => typeof value?.name === 'string')
        .map((value: LayoutPreset) => ({ name: value.name, layout: normalizeLayout(value.layout) })) : [],
    };
  } catch { /* 저장소를 사용할 수 없으면 기본 레이아웃으로 표시한다. */ }
  return { layout: defaultColumnLayout, presets: [] };
}

export function saveColumnSettings(profile: string, layout: ColumnLayout, presets: LayoutPreset[]) {
  localStorage.setItem(layoutStorageKey(profile), JSON.stringify({ layout, presets }));
}

function layoutStorageKey(profile: string) {
  return preferenceKey('equipment-search', `columns:${encodeURIComponent(profile.trim().toLocaleLowerCase())}`);
}
