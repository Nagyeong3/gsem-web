import type { ManagerAssignmentDto } from '../types/api';
import type { AssignmentType, Manager, ManagerRole } from '../types/domain';

const managerRoleMap: Record<NonNullable<ManagerAssignmentDto['role']>, ManagerRole> = {
  SUPPORT_EQUIPMENT_MANAGER: '지원장비 담당자',
  PURCHASING_MANAGER: '구매 담당자',
};

const assignmentTypeMap: Record<
  NonNullable<ManagerAssignmentDto['assignmentType']>,
  AssignmentType
> = {
  PRIMARY: '정',
  SECONDARY: '부',
};

export function toManager(manager: ManagerAssignmentDto): Manager {
  return {
    id: manager.userId,
    name: manager.name,
    role: manager.role ? managerRoleMap[manager.role] : undefined,
    assignmentType: manager.assignmentType
      ? assignmentTypeMap[manager.assignmentType]
      : undefined,
  };
}
