export type EquipmentStatus = '사용 중' | '대체 검토' | '보류';
export type DeliveryStatus = '예정' | '진행' | '완료';
export type ManagerRole = '지원장비 담당자' | '구매 담당자';
export type AssignmentType = '정' | '부';

export interface CodeLabel {
  code: string;
  name: string;
}

export interface Manager {
  id: number;
  name: string;
  role?: ManagerRole;
  assignmentType?: AssignmentType;
}

export interface Delivery {
  id: number;
  destination: string;
  quantity: number;
  deliveryDate: string;
  receiptDate?: string;
  status: DeliveryStatus;
}

export interface BusinessApplication {
  integratedId: number;
  business: string;
  aircraftType: string;
  deliveries: Delivery[];
}

export interface Equipment {
  itemId: number;
  itemNum: string;
  itemNameKor: string;
  itemNameEng: string;
  itemUsageKor: string;
  itemUsageEng: string;
  category: CodeLabel;
  manufacturer: string;
  systems: CodeLabel[];
  maintenanceLevels: CodeLabel[];
  applications: BusinessApplication[];
  managers: Manager[];
  status: EquipmentStatus;
  recentChangeDate: string;
  itemType?: string;
  serd?: {
    serdNumber?: string;
    size?: string;
    weight?: string;
    primaryUsage?: string;
  };
  qualityAssuranceType?: CodeLabel;
  calibration?: {
    required: boolean;
    cycleMonths?: number;
    method?: '사내' | '사외';
    provider?: string;
  };
  replacementSummary?: {
    predecessors: number;
    successors: number;
    hasBranch: boolean;
  };
}

export interface EquipmentFilters {
  query: string;
  aircraftType: string;
  business: string;
  system: string;
  category: string;
  manager: string;
  destination: string;
  status: string;
}

export interface EquipmentFilterOptions {
  aircraftTypes: string[];
  businesses: string[];
  systems: string[];
  categories: string[];
  managers: string[];
  destinations: string[];
  statuses: string[];
}

export interface EquipmentSearchRequest {
  filters: EquipmentFilters;
  sortKey: EquipmentSortKey;
  sortDirection: SortDirection;
  page: number;
  size: number;
}

export interface EquipmentSearchResult {
  items: Equipment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type EquipmentSortKey =
  | 'itemNum'
  | 'itemNameKor'
  | 'aircraftType'
  | 'business'
  | 'system'
  | 'category'
  | 'manager'
  | 'destination'
  | 'status'
  | 'recentChangeDate';

export type SortDirection = 'asc' | 'desc';

export interface DashboardMetric {
  id: 'attention' | 'registered' | 'delivery' | 'delay' | 'replacement' | 'approval';
  label: string;
  value: number;
  unit: string;
  tone: 'brand' | 'neutral' | 'info' | 'error' | 'warning';
  helper: string;
}

export interface MonthlyDelivery {
  month: string;
  plan: number;
  actual: number | null;
  achievement: number | null;
}

export interface ChangeSummary {
  id: string;
  equipmentName: string;
  content: string;
  category: string;
  requester: string;
  changedAt: string;
  status: '완료' | '검토 중';
}

export interface UpcomingDelivery {
  equipmentName: string;
  itemNum: string;
  deliveryDate: string;
  daysLeft: number;
  status: '임박';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  monthlyDeliveries: MonthlyDelivery[];
  changes: ChangeSummary[];
  upcomingDeliveries: UpcomingDelivery[];
}

export interface DeliverySchedule {
  deliveryId: number;
  itemId: number;
  itemNum: string;
  itemName: string;
  business: string;
  aircraftType: string;
  destination: string;
  plannedQuantity: number;
  orderedQuantity?: number;
  receivedQuantity?: number;
  deliveredQuantity?: number;
  deliveryDate: string;
  receiptDate?: string;
  status: DeliveryStatus;
  delayed?: boolean;
  managers: Manager[];
}

export interface DeliveryScheduleFilters {
  query: string;
  business: string;
  aircraftType: string;
  destination: string;
  status: string;
}

export type ChangeRequestStatus = '접수' | '검토 중' | '처리 완료';

export interface ChangeDifference {
  field: string;
  label: string;
  before?: string;
  after?: string;
}

export interface ChangeRequest {
  changeId: string;
  itemId: number;
  itemNum: string;
  itemName: string;
  changeType: string;
  requestedBy: Manager;
  requestedAt: string;
  processedBy?: Manager;
  processedAt?: string;
  status: ChangeRequestStatus;
  reason?: string;
  basis?: string;
  differences: ChangeDifference[];
}

export interface ChangeRequestFilters {
  query: string;
  changeType: string;
  status: string;
  requester: string;
}

export type ReplacementStatus = '사용 중' | '단종' | '대체 예정';

export interface ReplacementItem {
  id: string;
  itemNum: string;
  itemName: string;
  businesses: string[];
  status: ReplacementStatus;
  depth: number;
  position: { x: number; y: number };
}

export interface ReplacementRelation {
  id: string;
  source: string;
  target: string;
  changeId: string;
  changedAt: string;
  changeType: string;
  reason: string;
  requester: Manager;
  processor: Manager;
}

export interface ReplacementGraph {
  items: ReplacementItem[];
  relations: ReplacementRelation[];
}
