import { createContext, useContext } from 'react';

export type MockRole = '일반 조회자' | '지원장비 담당자' | '구매 담당자' | '승인자';

export interface MockPermissions {
  canCreateChangeDraft: boolean;
  canReviewChange: boolean;
  description: string;
}

export interface MockRoleContextValue {
  role: MockRole;
  permissions: MockPermissions;
  setRole: (role: MockRole) => void;
}

export const MockRoleContext = createContext<MockRoleContextValue | null>(null);

export function useMockRole() {
  const context = useContext(MockRoleContext);
  if (!context) throw new Error('useMockRole은 MockRoleProvider 내부에서 사용해야 합니다.');
  return context;
}

export const mockRoles: MockRole[] = [
  '일반 조회자',
  '지원장비 담당자',
  '구매 담당자',
  '승인자',
];
