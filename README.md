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
- 장비 통합 상세
  - 품목 기본정보와 복수 사업·기종·계통 표시
  - 복수 담당자, 사업별 납지, SERD, 품보·교정 정보
  - 단종·대체 관계 요약
- 납품 일정 관리
  - 사업·기종·납지·상태 필터와 통합 검색
  - 계획·발주·입고·납품 수량 및 선택 일정 상세
- 변경 신청 및 처리 현황
  - 신청 목록, 검색·필터, 변경 전·후 비교
  - 사유·근거·처리 과정 조회

변경 이력 그래프, 실제 변경 승인·저장, 실제 다운로드, 실제 로그인, DB 연동과 운영 백엔드는 현재 구현 범위에서 제외했습니다.

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
npm run test:stub
npm run build
```

브라우저 상호작용과 1440×900 화면 검수:

```bash
npx playwright install chromium
npm run test:e2e
```

Stub API를 실행한 상태에서 HTTP Adapter 연결만 별도로 검증하려면 다음 명령을 사용합니다.

```bash
VITE_DATA_SOURCE=api npm run test:e2e -- e2e/http-adapter.spec.ts
```

실행 화면 캡처는 다음 위치에 생성됩니다.

- `docs/prototype-screenshots/dashboard.png`
- `docs/prototype-screenshots/equipment-search.png`
- `docs/prototype-screenshots/equipment-detail.png`
- `docs/prototype-screenshots/delivery-schedule.png`
- `docs/prototype-screenshots/change-request.png`

## 목업 데이터 교체 위치

페이지와 UI 컴포넌트는 목업 Fixture를 직접 가져오지 않습니다.

```text
페이지
→ Service 인터페이스
→ Mock Service
→ Mock Fixture
```

데이터 공급자는 환경변수로 전환합니다. 기본값은 `mock`이므로 별도 설정 없이 현재 프로토타입이 실행됩니다.

```bash
cp .env.example .env.local
```

HTTP API 연결 시험 시 `.env.local`을 다음처럼 변경합니다.

```text
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=/api/v1
```

### 포함된 Stub API로 연결 시험

운영 백엔드 기술과 DB 연결 방식은 아직 확정하지 않습니다. 저장소의 Stub API는 OpenAPI 계약과 프론트 HTTP Adapter를 미리 검증하기 위한 개발 도구이며 Node.js 기본 모듈만 사용합니다.

첫 번째 터미널에서 Stub API를 실행합니다.

```bash
npm run stub:api
```

두 번째 터미널에서 프론트를 실행합니다.

```bash
npm run dev
```

`.env.local`은 위의 HTTP API 설정을 사용합니다. Vite가 `/api` 요청을 `http://127.0.0.1:4010`으로 전달하므로 브라우저에서는 기존과 동일하게 `http://localhost:5173`에 접속합니다. 상태 확인 주소는 `http://127.0.0.1:4010/health`입니다.

구성 경계:

```text
페이지
→ Service 인터페이스
→ Mock Adapter 또는 HTTP Adapter
→ API DTO Mapper
→ 화면 View Model
```

실제 서버 주소, 계정정보와 Token은 저장소에 Commit하지 않습니다.

화면 구조와 데이터 경계에 대한 설명은 `docs/development/prototype-architecture.md`를 참고합니다.

## API와 데이터 계약

실제 백엔드 구현 전에 검토할 API·프론트 데이터 계약 초안은 다음 문서에 정리했습니다.

- `docs/api/api-contract.md`: Endpoint, 검색·페이징·오류 규격과 ERD 매핑 기준
- `docs/api/openapi.yaml`: OpenAPI 3.1 형식의 조회 API 초안
- `docs/api/contract-review.md`: 요구사항·ERD·현재 코드 정합성 검토 결과
- `docs/development/frontend-data-model.md`: API DTO와 프론트 View Model 분리 기준
- `src/types/api.ts`: TypeScript API DTO 초안

`확정`, `가정`, `미확정`을 구분했으며 실제 DB Entity나 운영 상태값을 확정하지 않습니다.

## 프로토타입 가정

- 대시보드 지표는 실제 DB 집계 결과가 아닌 고정 목업값입니다.
- 납품 상태는 `예정`, `진행`, `완료`를 임시로 사용합니다.
- 담당자의 `정`·`부` 구분은 화면 검증을 위한 속성이며 실제 저장 필드는 미확정입니다.
- 검색 결과는 품목 하나당 한 행으로 표시합니다.
- 실제 사내 품번, 사업명, 직원정보, 연락처와 계약정보를 포함하지 않습니다.
- 변경 신청의 `접수`, `검토 중`, `처리 완료`와 처리 순서는 화면 검증용 가정입니다.
- 지연 판정 규칙은 미확정이므로 프론트에서 날짜만으로 자동 판정하지 않습니다.
