/**
 * GSEM API 계약 초안.
 *
 * DB Entity와 화면 View Model을 직접 공유하지 않기 위한 전송 전용 타입이다.
 * `가정`으로 표시된 상태값은 실제 업무 확인 후 교체해야 한다.
 */

export type IsoDateString = string;
export type IsoDateTimeString = string;

export interface ApiResponse<T> {
  data: T;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  traceId?: string;
  generatedAt: IsoDateTimeString;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedApiResponse<T> {
  data: T[];
  page: PageMeta;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Array<{
      field: string;
      reason: string;
    }>;
    traceId?: string;
  };
}

export interface CodeDto {
  code: string;
  name: string;
}

export interface DestinationDto {
  destinationId: number;
  name: string;
}

/**
 * 요구사항 008에 따른 관리 품목 유형.
 * 실제 공통코드와 코드값은 미확정이다.
 */
export type ItemTypeDto =
  | 'SUPPORT_EQUIPMENT'
  | 'BASIC_ISSUE_ITEM'
  | 'FLIGHT_GEAR_INSPECTION_EQUIPMENT'
  | 'STANDARD';

/** 가정: 프로토타입 화면 표현을 위한 임시 상태값. */
export type ItemStatusDto = 'IN_USE' | 'REPLACEMENT_REVIEW' | 'ON_HOLD';

/** 의미 확정: 납품 예정·진행·완료. 영문 전송 코드 자체는 API 설계값이다. */
export type DeliveryStatusDto = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

export type ManagerRoleDto = 'SUPPORT_EQUIPMENT_MANAGER' | 'PURCHASING_MANAGER';
export type AssignmentTypeDto = 'PRIMARY' | 'SECONDARY';

export interface ManagerAssignmentDto {
  userId: number;
  name: string;
  /** DB 컬럼은 존재하지만 현재 값이 없을 수 있다. */
  role?: ManagerRoleDto;
  /** 정·부 구분은 현재 DB에 반영되지 않은 확장 후보다. */
  assignmentType?: AssignmentTypeDto;
}

export interface DeliveryDto {
  deliveryId: number;
  destination: CodeDto;
  quantity: number;
  deliveryDate: IsoDateString;
  receiptDate?: IsoDateString;
  status: DeliveryStatusDto;
}

export interface BusinessApplicationDto {
  integratedInfoId: number;
  business: {
    businessId: number;
    name: string;
  };
  aircraftType: CodeDto;
  deliveries: DeliveryDto[];
}

export interface ItemSummaryDto {
  itemId: number;
  itemNumber: string;
  itemNameKor: string;
  itemNameEng?: string;
  /** 요구사항에는 존재하지만 현재 ERD의 저장 위치는 미정이다. */
  itemType?: ItemTypeDto;
  category: CodeDto;
  vendor?: {
    vendorId: number;
    name: string;
  };
  aircraftTypes: CodeDto[];
  businesses: Array<{
    businessId: number;
    name: string;
  }>;
  subsystems: CodeDto[];
  maintenanceLevels: CodeDto[];
  managers: ManagerAssignmentDto[];
  destinations: DestinationDto[];
  status: ItemStatusDto;
  recentChangeDate?: IsoDateString;
}

export interface SerdDto {
  serdNumber?: string;
  size?: string;
  weight?: string;
  primaryUsage?: string;
}

export interface CalibrationDto {
  required: boolean;
  cycleMonths?: number;
  method?: 'IN_HOUSE' | 'OUTSOURCED';
  calibrationProvider?: string;
}

export interface ReplacementRelationSummaryDto {
  predecessors: number;
  successors: number;
  hasBranch: boolean;
}

export interface ItemDetailDto extends ItemSummaryDto {
  itemUsageKor?: string;
  itemUsageEng?: string;
  serd?: SerdDto;
  qualityAssuranceType?: CodeDto;
  calibration?: CalibrationDto;
  applications: BusinessApplicationDto[];
  replacementSummary?: ReplacementRelationSummaryDto;
}

export interface ItemSearchQueryDto {
  query?: string;
  itemType?: ItemTypeDto;
  aircraftTypeCode?: string;
  businessId?: number;
  subsystemCode?: string;
  categoryCode?: string;
  managerUserId?: number;
  destinationId?: number;
  status?: ItemStatusDto;
  sort?: ItemSortDto;
  page?: number;
  size?: number;
}

export type ItemSortFieldDto =
  | 'itemNumber'
  | 'itemNameKor'
  | 'aircraftType'
  | 'business'
  | 'subsystem'
  | 'category'
  | 'manager'
  | 'destination'
  | 'status'
  | 'recentChangeDate';

export type SortDirectionDto = 'asc' | 'desc';
export type ItemSortDto = `${ItemSortFieldDto},${SortDirectionDto}`;

export interface ItemFilterOptionsDto {
  itemTypes: Array<{ value: ItemTypeDto; label: string }>;
  aircraftTypes: CodeDto[];
  businesses: Array<{ businessId: number; name: string }>;
  subsystems: CodeDto[];
  categories: CodeDto[];
  managers: Array<{ userId: number; name: string }>;
  destinations: DestinationDto[];
  statuses: Array<{ value: ItemStatusDto; label: string }>;
}

export type DashboardMetricIdDto =
  | 'ATTENTION'
  | 'REGISTERED'
  | 'DELIVERY'
  | 'DELAY'
  | 'REPLACEMENT'
  | 'APPROVAL';

export interface DashboardOverviewDto {
  metrics: Array<{
    id: DashboardMetricIdDto;
    label: string;
    value: number;
    unit: string;
    tone: 'BRAND' | 'NEUTRAL' | 'INFO' | 'ERROR' | 'WARNING';
    helper: string;
  }>;
  monthlyDeliveries: Array<{
    month: string;
    plannedQuantity: number;
    deliveredQuantity: number | null;
    achievementRate: number | null;
  }>;
  recentChanges: Array<{
    changeId: string;
    itemId: number;
    itemName: string;
    content: string;
    category: string;
    requesterName: string;
    changedAt: IsoDateString;
    status: string;
  }>;
  upcomingDeliveries: Array<{
    deliveryId: number;
    itemId: number;
    itemName: string;
    itemNumber: string;
    deliveryDate: IsoDateString;
    daysLeft: number;
    status: string;
  }>;
}

/** 후속 화면용 조회 계약. 실제 납품 단계와 지연 판정 규칙은 미확정이다. */
export interface DeliveryScheduleDto {
  deliveryId: number;
  integratedInfoId: number;
  item: {
    itemId: number;
    itemNumber: string;
    itemName: string;
  };
  business: {
    businessId: number;
    name: string;
  };
  aircraftType: CodeDto;
  destination: CodeDto;
  /** 계획 수량. 기존 `quantity` 응답과의 전환 기간에는 둘 중 하나를 사용할 수 있다. */
  plannedQuantity?: number;
  /** ERD의 현재 수량 필드와 호환하기 위한 임시 필드다. */
  quantity?: number;
  orderedQuantity?: number;
  receivedQuantity?: number;
  deliveredQuantity?: number;
  deliveryDate: IsoDateString;
  receiptDate?: IsoDateString;
  status: DeliveryStatusDto;
  delayed?: boolean;
  managers: ManagerAssignmentDto[];
}

/** 후속 화면용 조회 계약. 승인 상태 전이와 변경 유형 코드는 미확정이다. */
export type ChangeEventStatusDto = 'RECEIVED' | 'IN_REVIEW' | 'PROCESSED';

export interface ChangeEventDto {
  changeId: string;
  item: {
    itemId: number;
    itemNumber: string;
    itemName: string;
  };
  changeType: string;
  requestedBy: ManagerAssignmentDto;
  requestedAt: IsoDateTimeString;
  processedBy?: ManagerAssignmentDto;
  processedAt?: IsoDateTimeString;
  /** 프로토타입 전송 코드이며 실제 상태 전이는 미확정이다. */
  status: ChangeEventStatusDto;
  reason?: string;
  basis?: string;
  differences: Array<{
    field: string;
    label: string;
    before?: string;
    after?: string;
  }>;
}

/** 후속 트리 화면용 조회 계약. 대체 관계의 유효기간과 사업 종속 여부는 미확정이다. */
export interface ReplacementGraphDto {
  rootItemId: number;
  nodes: Array<{
    itemId: number;
    itemNumber: string;
    itemName: string;
    businesses: string[];
    status: string;
  }>;
  edges: Array<{
    relationId: string;
    sourceItemId: number;
    targetItemId: number;
    businessIds?: number[];
    effectiveFrom?: IsoDateString;
    effectiveTo?: IsoDateString;
    /** 아래 변경 상세 필드는 프로토타입 화면 조회용이며 실제 원천은 미확정이다. */
    changeId?: string;
    changedAt?: IsoDateString;
    changeType?: string;
    reason?: string;
    requestedBy?: ManagerAssignmentDto;
    processedBy?: ManagerAssignmentDto;
  }>;
}
