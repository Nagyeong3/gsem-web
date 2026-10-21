import { runtimeConfig } from '../../config/runtime';
import { progressOptions } from '../../data/equipmentMasterMock';
import type { EquipmentMasterItem, ProgressTone, RiskLevel, UnitDelivery } from '../../types/equipmentMaster';

export type DbDelivery = { matchId: number; subContractName: string | null; destination: string | null; quantity: number | null; receivingExpected: string | null; receivedAt: string | null; deliveredAt: string | null; contractDate: string | null; buyerName: string | null; vendorName: string | null; subContractId: number };
export type DbMasterRow = { integratedId: number; itemId: number; businessId: number; businessName: string | null; itemNumber: string; itemNameKor: string | null; description: string | null; managerName: string | null; manufacturer: string | null; imagePath: string | null; deliveries: DbDelivery[] };
export type DbMasterResponse = { items: DbMasterRow[]; page: number; size: number; totalElements: number; totalPages: number; readOnly: boolean };
export const realDataMode = runtimeConfig.dataSource === 'api';

export function dateText(value: string | null): string { return value ? value.slice(0, 10) : ''; }
export function normalizeDestination(value: string | null): string {
  return (value || '납지 미지정').replace(/\s+/g, '').trim() || '납지 미지정';
}
export function summarizeDate(values: Array<string | null>): string {
  const dates = [...new Set(values.map(dateText).filter(Boolean))];
  return dates.length > 1 ? '다건(상세)' : dates[0] || '';
}
export function mapDatabaseItem(row: DbMasterRow): EquipmentMasterItem {
  const originalLines = row.deliveries ?? [];
  const seen = new Set<number>();
  const unique = originalLines.filter((line) => {
    if (seen.has(line.matchId)) return false;
    seen.add(line.matchId);
    return true;
  });
  const issues: string[] = [];
  if (!originalLines.length) issues.push('계약·납품 데이터 미등록');
  if (unique.length !== originalLines.length) issues.push(`중복 matchId ${originalLines.length - unique.length}건: 합계 제외`);
  const grouped = new Map<string, DbDelivery[]>();
  for (const line of unique) {
    const key = normalizeDestination(line.destination);
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
    if (line.quantity == null || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) < 0) issues.push(`계약 #${line.matchId}: 수량 확인 필요`);
    if (!line.destination?.trim()) issues.push(`계약 #${line.matchId}: 납품처 미등록`);
    if (line.deliveredAt && line.receivedAt && dateText(line.deliveredAt) < dateText(line.receivedAt)) issues.push(`계약 #${line.matchId}: 납품일이 입고일보다 빠름`);
  }
  const deliveries: UnitDelivery[] = [...grouped.entries()].map(([unitName, lines]) => {
    const inboundExpected = summarizeDate(lines.map((line) => line.receivingExpected));
    const inboundActual = summarizeDate(lines.map((line) => line.receivedAt));
    const deliveredAt = summarizeDate(lines.map((line) => line.deliveredAt));
    const deliveryPlan = summarizeDate(lines.map((line) => line.contractDate));
    if ([inboundExpected, inboundActual, deliveredAt, deliveryPlan].some((value) => value === '다건(상세)')) {
      issues.push(`${unitName}: 계약별 날짜가 다름 (상세 확인)`);
    }
    return {
      unitName, contracted: true,
      quantity: lines.reduce((sum, line) => sum + (line.quantity != null && Number.isFinite(Number(line.quantity)) && Number(line.quantity) >= 0 ? Number(line.quantity) : 0), 0),
      inboundExpected, inboundActual, deliveredAt, deliveryPlan,
    };
  });
  const buyer = [...new Set(unique.map((entry) => entry.buyerName).filter(Boolean))].join(', ');
  const supplier = [...new Set(unique.map((entry) => entry.vendorName).filter(Boolean))].join(', ');
  return {
    id: String(row.integratedId), businessName: row.businessName || `사업 ID ${row.businessId}`, itemId: row.itemId, imagePath: row.imagePath || undefined, managerName: row.managerName || '-',
    contractLines: unique.map((line) => ({ matchId: line.matchId, subContractId: line.subContractId, subContractName: line.subContractName || '-', destination: line.destination || '미등록', quantity: line.quantity, receivingExpected: dateText(line.receivingExpected), receivedAt: dateText(line.receivedAt), deliveredAt: dateText(line.deliveredAt), deliveryPlan: dateText(line.contractDate), buyerName: line.buyerName || '-', vendorName: line.vendorName || '-' })),
    validationIssues: issues,
    risk: '?', itemNameKor: row.itemNameKor || '-', itemNumber: row.itemNumber || '-', material: '-', buyer: buyer || '-', supplier: supplier || '-',
    progress: '미등록', progressTone: 'info', tdtCode: '-', description: row.description || '-',
    maintenance: { priority: 0, serviceable: '-', hour100: '-', hour600: '-', periodicInspection: '-', planned: '-', unplanned: '-' }, deliveries,
  };
}

export type DbBusiness = { businessId: number; businessName: string };
export type DbFilterOptions = { vendors: string[]; buyers: string[] };
export async function fetchMasterFilterOptions(): Promise<DbFilterOptions> { const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master/filter-options`); if (!response.ok) throw new Error(`필터 조회 실패 (HTTP ${response.status})`); return (await response.json()) as DbFilterOptions; }
export async function fetchBusinessOptions(): Promise<DbBusiness[]> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master/businesses`);
  if (!response.ok) throw new Error(`사업 목록 조회 오류 (HTTP ${response.status})`);
  return (await response.json()) as DbBusiness[];
}
export async function fetchDatabaseMaster(page: number, size: number, query: string, businessId: number | null, vendor: string, buyer: string): Promise<DbMasterResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size), query });
  if (businessId != null) params.set('businessId', String(businessId));
  if (vendor) params.set('vendor', vendor);
  if (buyer) params.set('buyer', buyer);
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master?${params.toString()}`);
  if (!response.ok) throw new Error(`통합현황 데이터 요청에 실패했습니다. (HTTP ${response.status})`);
  return (await response.json()) as DbMasterResponse;
}

export function cloneItem(item: EquipmentMasterItem): EquipmentMasterItem {
  return JSON.parse(JSON.stringify(item)) as EquipmentMasterItem;
}

export function inferProgressTone(progress: string): ProgressTone {
  return progressOptions.find((option) => option.label === progress)?.tone ?? 'info';
}

export function getDelivery(item: EquipmentMasterItem, unitName: string) {
  return item.deliveries.find((delivery) => delivery.unitName === unitName);
}

export function getTotalQuantity(item: EquipmentMasterItem) {
  return item.deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
}

export function getRiskStyle(risk: RiskLevel) {
  if (risk === '?') return { color: '#98A2B3', label: '-' };
  if (risk === 'R') return { color: '#F04438', label: 'R' };
  if (risk === 'Y') return { color: '#F59E0B', label: 'Y' };
  return { color: '#12B76A', label: 'G' };
}

export function getProgressStyle(tone: ProgressTone) {
  if (tone === 'error') return { color: '#F04438', bg: '#FFF1F0' };
  if (tone === 'warning') return { color: '#B45309', bg: '#FFF7E6' };
  if (tone === 'info') return { color: '#0F6BFF', bg: '#EAF3FF' };
  return { color: '#079455', bg: '#E7F8EF' };
}

export function equipmentImageDataUrl(item: EquipmentMasterItem, large = false) {
  const seed = Array.from(item.itemNumber).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = seed % 360;
  const width = large ? 360 : 120;
  const height = large ? 220 : 76;
  const title = item.itemNumber.replace(/&/g, '&amp;').slice(0, 14);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 66%, 92%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 42) % 360}, 66%, 76%)"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="14" fill="url(#bg)"/>
      <rect x="${width * 0.18}" y="${height * 0.28}" width="${width * 0.64}" height="${height * 0.32}" rx="10" fill="rgba(255,255,255,0.88)" stroke="rgba(12,34,64,0.16)"/>
      <circle cx="${width * 0.72}" cy="${height * 0.34}" r="${large ? 18 : 7}" fill="rgba(15,107,255,0.24)"/>
      <rect x="${width * 0.30}" y="${height * 0.43}" width="${width * 0.40}" height="${large ? 14 : 5}" rx="4" fill="rgba(12,34,64,0.22)"/>
      <text x="${width / 2}" y="${height * 0.82}" text-anchor="middle" fill="#0B1F3A" font-size="${large ? 22 : 10}" font-weight="700" font-family="Arial, sans-serif">${title}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

