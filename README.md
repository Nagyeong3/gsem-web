# 지원장비 관리시스템 프로토타입

지원장비 정보를 통합 조회하고 납품·변경 현황을 확인하기 위한 웹 프로토타입입니다. 현재 단계에서는 실제 DB와 운영 API를 연결하지 않고 일반화한 목업 데이터를 사용합니다.

## 현재 구현 범위

- 메인 대시보드
  - 주요 현황 카드
  - 월별 납품 계획 대비 실적
  - 확인이 필요한 업무
  - 최근 변경 이력과 납품 임박 품목
  - 통합 검색을 통한 장비 검색 화면 이동
- 장비 검색
  - 품번·품명·용도 검색
  - 기종·사업·계통·장비 구분·담당자·납지·상태 필터
  - 선택 조건 표시와 개별 제거
  - 검색 결과 정렬과 페이지 이동
  - 품목당 한 행 표시
  - 장비 상세 패널
  - 로딩·빈 결과·오류 상태

변경 이력, 변경 신청, 실제 다운로드, 실제 로그인, DB 연동과 운영 백엔드는 이번 구현 범위에서 제외했습니다.

## 기술 구성

- React 19
- TypeScript
- Vite
- MUI와 MUI Icons
- Recharts
- Vitest
- Playwright

## 실행 방법

Node.js 설치 후 저장소 루트에서 실행합니다.

```bash
npm install
npm run dev
```

기본 접속 주소는 `http://localhost:5173`입니다.

## 검증 방법

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

브라우저 상호작용과 1440×900 화면 검수:

```bash
npx playwright install chromium
npm run test:e2e
```

실행 화면 캡처는 다음 위치에 생성됩니다.

- `docs/prototype-screenshots/dashboard.png`
- `docs/prototype-screenshots/equipment-search.png`

## 목업 데이터 교체 위치

페이지와 UI 컴포넌트는 목업 Fixture를 직접 가져오지 않습니다.

```text
페이지
→ Service 인터페이스
→ Mock Service
→ Mock Fixture
```

향후 API가 확정되면 다음 Mock Service를 HTTP Adapter로 교체합니다.

- `src/services/dashboardService.ts`
- `src/services/equipmentService.ts`

화면 구조와 데이터 경계에 대한 설명은 `docs/development/prototype-architecture.md`를 참고합니다.

## 프로토타입 가정

- 대시보드 지표는 실제 DB 집계 결과가 아닌 고정 목업값입니다.
- 납품 상태는 `예정`, `진행`, `완료`를 임시로 사용합니다.
- 담당자의 `정`·`부` 구분은 화면 검증을 위한 속성이며 실제 저장 필드는 미확정입니다.
- 검색 결과는 품목 하나당 한 행으로 표시합니다.
- 실제 사내 품번, 사업명, 직원정보, 연락처와 계약정보를 포함하지 않습니다.
