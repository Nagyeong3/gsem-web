import { useMemo, useState, type ReactNode } from 'react';
import {
  MockRoleContext,
  type MockPermissions,
  type MockRole,
  type MockRoleContextValue,
} from './mockRoleContext';

const rolePermissions: Record<MockRole, MockPermissions> = {
  '일반 조회자': {
    canCreateChangeDraft: false,
    canReviewChange: false,
    description: '전체 업무정보를 조회할 수 있습니다.',
  },
  '지원장비 담당자': {
    canCreateChangeDraft: true,
    canReviewChange: false,
    description: '담당 품목의 변경 신청 초안을 작성할 수 있습니다.',
  },
  '구매 담당자': {
    canCreateChangeDraft: true,
    canReviewChange: false,
    description: '구매·납품 관련 변경 신청 초안을 작성할 수 있습니다.',
  },
  승인자: {
    canCreateChangeDraft: false,
    canReviewChange: true,
    description: '변경 처리 현황과 검토 대상을 조회할 수 있습니다.',
  },
};

function getInitialRole(): MockRole {
  const saved = window.localStorage.getItem('gsem-mock-role');
  return saved && saved in rolePermissions ? (saved as MockRole) : '지원장비 담당자';
}

export function MockRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>(getInitialRole);
  const value = useMemo<MockRoleContextValue>(() => ({
    role,
    permissions: rolePermissions[role],
    setRole(nextRole) {
      window.localStorage.setItem('gsem-mock-role', nextRole);
      setRoleState(nextRole);
    },
  }), [role]);

  return <MockRoleContext.Provider value={value}>{children}</MockRoleContext.Provider>;
}
