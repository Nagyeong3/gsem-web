import { runtimeConfig } from '../config/runtime';
import { mockDashboardService } from './dashboardService';
import { mockEquipmentService } from './equipmentService';
import { mockDeliveryScheduleService } from './deliveryScheduleService';
import { ApiClient } from './http/apiClient';
import { createHttpDashboardService } from './http/httpDashboardService';
import { createHttpEquipmentService } from './http/httpEquipmentService';

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

export const deliveryScheduleService = mockDeliveryScheduleService;
