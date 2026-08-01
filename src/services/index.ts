import { runtimeConfig } from '../config/runtime';
import { mockDashboardService } from './dashboardService';
import { mockEquipmentService } from './equipmentService';
import { mockDeliveryScheduleService } from './deliveryScheduleService';
import { mockChangeRequestService } from './changeRequestService';
import { mockReplacementHistoryService } from './replacementHistoryService';
import { ApiClient } from './http/apiClient';
import { createHttpDashboardService } from './http/httpDashboardService';
import { createHttpEquipmentService } from './http/httpEquipmentService';
import { createHttpDeliveryScheduleService } from './http/httpDeliveryScheduleService';
import { createHttpChangeRequestService } from './http/httpChangeRequestService';
import { createHttpReplacementHistoryService } from './http/httpReplacementHistoryService';

const apiClient = new ApiClient({
  baseUrl: runtimeConfig.apiBaseUrl,
  timeoutMs: runtimeConfig.apiTimeoutMs,
});

export const dashboardService =
  runtimeConfig.dataSource === 'api'
    ? createHttpDashboardService(apiClient)
    : mockDashboardService;

export const equipmentService =
  runtimeConfig.dataSource === 'api'
    ? createHttpEquipmentService(apiClient)
    : mockEquipmentService;

export const deliveryScheduleService =
  runtimeConfig.dataSource === 'api'
    ? createHttpDeliveryScheduleService(apiClient)
    : mockDeliveryScheduleService;

export const changeRequestService =
  runtimeConfig.dataSource === 'api'
    ? createHttpChangeRequestService(apiClient)
    : mockChangeRequestService;

export const replacementHistoryService =
  runtimeConfig.dataSource === 'api'
    ? createHttpReplacementHistoryService(apiClient)
    : mockReplacementHistoryService;
