import type { EquipmentSortKey } from '../../types/domain';

export const pageSizeOptions = [20, 50, 100];
export const defaultPageSize = 20;

export const columns: Array<{ key: EquipmentSortKey; label: string }> = [
  { key: 'itemNum', label: '품번' },
  { key: 'itemNameKor', label: '품명' },
  { key: 'aircraftType', label: '기종' },
  { key: 'business', label: '사업' },
  { key: 'system', label: '계통' },
  { key: 'category', label: '장비 구분' },
  { key: 'manager', label: '담당자' },
  { key: 'destination', label: '주요 납지' },
  { key: 'status', label: '상태' },
  { key: 'recentChangeDate', label: '최근 변경일' },
];


