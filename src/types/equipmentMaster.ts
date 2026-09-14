export type RiskLevel = 'G' | 'Y' | 'R';
export type ProgressTone = 'success' | 'warning' | 'error' | 'info';
export type MasterViewMode = 'excel' | 'optimized';

export interface UnitDelivery {
  unitName: string;
  contracted: boolean;
  inboundExpected?: string;
  deliveryPlan?: string;
  inboundActual?: string;
  deliveredAt?: string;
  quantity: number;
}

export interface MaintenanceInfo {
  priority: number;
  serviceable: 'O' | '△' | '-';
  hour100: string;
  hour600: string;
  periodicInspection: string;
  planned: 'O' | '-';
  unplanned: 'O' | '-';
}

export interface EquipmentMasterItem {
  id: string;
  risk: RiskLevel;
  itemNameKor: string;
  itemNumber: string;
  material: string;
  buyer: string;
  supplier: string;
  progress: string;
  progressTone: ProgressTone;
  tdtCode: string;
  description: string;
  maintenance: MaintenanceInfo;
  deliveries: UnitDelivery[];
}
