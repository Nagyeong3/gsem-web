import type { CodeLabel, Equipment, EquipmentFilterOptions, EquipmentSearchRequest } from '../../types/domain';
import type { EquipmentService } from '../equipmentService';
import type { ApiClient } from './apiClient';
import { advancedChoiceFields, advancedTextFields } from '../../features/equipment-search/advancedFilters';
import { runtimeConfig } from '../../config/runtime';

type DbDelivery = {
  matchId: number; subContractId: number; subContractName: string | null;
  destination: string | null; contractDate: string | null; quantity: number;
  receivingExpected: string | null; receivedAt: string | null; deliveredAt: string | null;
  contractPrice: number | null; purchaseRequestNumber: string | null;
  purchaseOrderNumber: string | null; vendorName: string | null; buyerName: string | null;
  receivingWarrantyDate?: string | null; deliveryWarrantyDate?: string | null;
};
type DbEquipment = {
  itemId: number; itemNumber: string; itemNsn?: string | null; itemNameKor: string;
  kaiPartNumber?: string | null; commonName?: string | null; itemType?: string | null;
  categoryCode?: string | null; category?: CodeLabel | null; systems?: CodeLabel[]; maintenanceLevels?: CodeLabel[];
  serd?: { serdNumber?: string | null; lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null; weightKg?: number | null };
  itemNameEng: string | null; itemUsageKor: string | null; itemUsageEng?: string | null;
  manufacturer: string | null; imageAvailable: boolean; diminishing: boolean;
  managers: string[];
  applications: Array<{
    integratedId: number; businessId: number; businessName: string;
    aircraftTypeCode: string | null; deliveries: DbDelivery[];
  }>;
};
type DbOptions = {
  businesses: Array<{ id: number; name: string }>;
  advanced?: EquipmentFilterOptions['advanced'];
  aircraftTypes: string[]; managers: string[]; destinations: string[];
};

function toEquipment(row: DbEquipment): Equipment {
  const deliveries = row.applications.flatMap((application) => application.deliveries);
  return {
    itemId: row.itemId, itemNum: row.itemNumber, itemNsn: row.itemNsn?.trim() || undefined, itemNameKor: row.itemNameKor,
    itemNameEng: row.itemNameEng ?? '', itemUsageKor: row.itemUsageKor ?? '', itemUsageEng: row.itemUsageEng ?? '',
    kaiPartNumber: row.kaiPartNumber?.trim() || undefined, commonName: row.commonName?.trim() || undefined,
    itemType: row.itemType?.trim() || undefined,
    category: row.category ?? { code: row.categoryCode?.trim() || '', name: row.categoryCode?.trim() || '미연결' },
    manufacturer: row.manufacturer ?? '-',
    systems: row.systems ?? [], maintenanceLevels: row.maintenanceLevels ?? [],
    serd: row.serd ? { ...row.serd, serdNumber: row.serd.serdNumber?.trim() || undefined } : undefined,
    applications: row.applications.map((application) => ({
      integratedId: application.integratedId,
      business: application.businessName,
      aircraftType: application.aircraftTypeCode ?? '-',
      deliveries: application.deliveries.map((delivery) => ({
        id: delivery.matchId, destination: delivery.destination ?? '-',
        quantity: delivery.quantity, deliveryDate: delivery.contractDate ?? '-',
        receiptDate: delivery.receivedAt ?? undefined,
        status: delivery.deliveredAt ? '완료' : delivery.receivedAt ? '진행' : '예정',
      })),
    })),
    managers: row.managers.map((name, index) => ({ id: index + 1, name })),
    status: '미확인', recentChangeDate: '-',
    imageUrl: row.imageAvailable
      ? `${runtimeConfig.apiBaseUrl}/equipment-master/image/${encodeURIComponent(row.itemId)}`
      : undefined,
    databaseDetails: {
      diminishing: row.diminishing, deliveries: deliveries.map((entry) => ({ ...entry })),
      applications: row.applications.map(({ integratedId, businessId, businessName, aircraftTypeCode }) => ({
        integratedId, businessId, businessName, aircraftTypeCode,
      })),
    },
  };
}

export function createHttpSqlEquipmentService(client: ApiClient): EquipmentService {
  let optionsPromise: Promise<DbOptions> | undefined;
  const loadOptions = () => {
    if (!optionsPromise) optionsPromise = client.get<DbOptions>('/equipment-search/filter-options')
      .catch((error) => { optionsPromise = undefined; throw error; });
    return optionsPromise;
  };
  return {
    async suggest(field, query, signal) {
      const params = new URLSearchParams({ field, query });
      const response = await client.get<{ options: string[] }>('/equipment-search/suggestions', params, signal);
      return response.options;
    },
    async search(request: EquipmentSearchRequest) {
      const options = await loadOptions();
      const params = new URLSearchParams({ page: String(request.page), size: String(request.size) });
      if (request.filters.query) params.set('query', request.filters.query);
      const businessId = options.businesses.find((business) => business.name === request.filters.business)?.id;
      if (businessId) params.set('businessId', String(businessId));
      if (request.filters.aircraftType) params.set('aircraftType', request.filters.aircraftType);
      if (request.filters.manager) params.set('manager', request.filters.manager);
      if (request.filters.destination) params.set('destination', request.filters.destination);
      const advanced = request.filters.advanced;
      for (const [key] of advancedTextFields) if (advanced?.[key]) params.set(key, advanced[key]);
      for (const [key] of advancedChoiceFields) advanced?.[key]?.forEach(value => params.append(key, value));
      const field = request.sortKey === 'itemNameKor' ? 'itemNameKor' : 'itemNumber';
      params.set('sort', `${field},${request.sortDirection}`);
      type SearchResponse = { items: DbEquipment[]; page: number; size: number; totalElements: number; totalPages: number };
      const result = request.filters.partNumbers?.length
        ? await client.post<SearchResponse>('/equipment-search/batch', request.filters.partNumbers, params)
        : await client.get<SearchResponse>('/equipment-search', params);
      return { items: result.items.map(toEquipment), page: result.page, size: result.size,
        totalElements: result.totalElements, totalPages: Math.max(1, result.totalPages) };
    },
    async getById(itemId: number) {
      if (!itemId) return undefined;
      const result = await client.get<DbEquipment>(`/equipment-search/${itemId}`);
      return toEquipment(result);
    },
    async getFilterOptions(): Promise<EquipmentFilterOptions> {
      const result = await loadOptions();
      return { advanced: result.advanced, aircraftTypes: result.aircraftTypes, businesses: result.businesses.map((item) => item.name),
        systems: [], categories: [], managers: result.managers, destinations: result.destinations, statuses: [] };
    },
  };
}
