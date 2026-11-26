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

장비 변경 이력의 5단계 대체 계보와 전체 조회 화면의 로딩·오류·빈 결과·재시도 상태를 구현했습니다. 실제 변경 승인·저장, 실제 다운로드, 실제 로그인, DB 연동과 운영 백엔드는 현재 구현 범위에서 제외했습니다.

V5에서는 네 가지 Mock 역할, 장비 검색 URL 상태 복원, 장비 상세에서 납품·변경·대체 이력으로 이어지는 전체 업무 시나리오와 브라우저 메모리 전용 변경 신청 초안을 제공합니다. Mock 역할은 실제 인증이나 운영 권한 정책이 아닙니다.

V7에서는 V6 전체 화면과 품질 감사 결과를 유지하면서 백엔드를 FastAPI로 전환했습니다. 프론트 HTTP 계약, Repository–Service–Router 경계, 요청 ID, 입력 검증, JSON 인메모리 데이터와 향후 MS Access 어댑터 위치를 제공합니다. 품목 검색 조건·정렬·페이징은 Repository 경계에서 처리합니다. 실제 DB는 연결하지 않습니다.

현재 상태와 작업 시작 순서는 `docs/handoff/current-state.md`를 기준으로 확인합니다.

## 기술 구성

- React 19
- TypeScript
- Vite
- MUI와 MUI Icons
- Recharts
- Vitest
- Playwright
- Python 3.12
- FastAPI와 Uvicorn
- Pytest와 Ruff

## 실행 방법

Node.js와 Python 3.12 설치 후 저장소 루트에서 실행합니다.

```bash
npm install
python -m venv .venv
# Windows: .venv\Scripts\python -m pip install -r requirements-dev.txt
# macOS/Linux: .venv/bin/python -m pip install -r requirements-dev.txt
npm run dev
```

기본 접속 주소는 `http://localhost:5173`입니다.

## 검증 방법

```bash
npm run typecheck
npm run lint
npm run lint:backend
npm run test
npm run test:contract
npm run test:backend
npm run build
```

브라우저 상호작용과 1440×900 화면 검수:

```bash
npx playwright install chromium
npm run test:e2e
```

FastAPI를 포함한 HTTP Adapter 브라우저 연결을 검증하려면 다음 명령을 사용합니다.

```bash
npm run test:e2e:api
```

### Windows / 폐쇄망에서 FastAPI와 프론트 실행

프로젝트 **루트 디렉터리**에서 PowerShell 터미널 두 개를 열어 각각 실행합니다. 기존 가상환경 `.venv`와 `node_modules`를 그대로 사용할 수 있습니다.

**터미널 1 — FastAPI (4010 포트):**

개발망의 다른 PC에서도 API에 접속할 수 있도록 `0.0.0.0`에 바인딩합니다. 이 설정은 서버가 외부 네트워크에서 접근 가능하게 하므로 방화벽에서 신뢰할 수 있는 개발망 클라이언트만 허용하세요.

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 4010
```

가상환경을 이미 활성화했다면 아래 명령으로도 실행할 수 있습니다.

```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 4010
```

**터미널 2 — 프론트엔드 API 모드 (기본 5173 포트):**

```powershell
$env:VITE_DATA_SOURCE = "api"
npm run dev -- --host 127.0.0.1 --mode api
```

브라우저: `http://127.0.0.1:5173` · API 상태 확인: `http://127.0.0.1:4010/health`

`npm run dev:api`는 두 프로세스를 한 번에 실행하는 편의 명령이지만, 일부 Windows/Node.js 환경에서는 `spawn EINVAL` 오류가 발생할 수 있습니다. 이 경우 위와 같이 **터미널을 분리하여 실행**합니다. PowerShell에서 `$env:VITE_DATA_SOURCE` 설정은 해당 터미널 세션에만 적용됩니다.

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

### 포함된 FastAPI로 연결 시험

FastAPI는 OpenAPI 계약과 프론트 HTTP Adapter를 실제 HTTP 경계에서 검증합니다. 현재 Repository는 일반화한 JSON 데이터를 메모리로 읽으며 실제 DB 연결 방식은 아직 확정하지 않습니다.

첫 번째 터미널에서 인메모리 API를 실행합니다.

```bash
npm run server:dev
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

DB 연결 직전 구조와 확인 항목은 다음 문서를 참고합니다.

- `docs/development/fastapi-migration.md`
- `docs/development/prototype-v6-backend-ready.md`
- `docs/api/erd-api-field-mapping.md`
- `docs/development/database-connection-checklist.md`

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

## v0.20.0 납품 일정 달력 및 편집 UI (개발 중)

- `/deliveries`는 `Sub_Contract.delivery_date_contract`(계약상 납기) 기준 **월간 달력**을 보여줍니다.
- 좌우 월 이동, 오늘, 사업별 복수 필터, 납품완료 숨김, 일자별 차수 목록·상세 팝업을 제공합니다.
- API 모드는 읽기 전용 `/api/v1/equipment-master/businesses` 및 `/api/v1/delivery-rounds`를 이용합니다.
- Mock 모드는 기존 가상 차수 데이터와 동일한 일정을 사용하며, 일정이 없는 달에는 예시 월로 이동할 수 있습니다.
- 통합현황의 사업 분류(전체/회전익/고정익)는 **UI만 제공**합니다. 향후 `Business.code_ATYPE` 코드 매핑 확인 후 종속 필터를 연결해야 합니다.
- 통합현황 계약상 납기 인라인 편집, 아이템 체크박스·일괄 날짜 입력·입고 확인은 **DB 쓰기 미연결 UI 시안**입니다. 저장 또는 확인 클릭으로 실제 데이터가 변경되지 않습니다. 운영 전 권한·검증·감사이력을 확정한 후 API를 개발해야 합니다.
- 아이템 테이블은 자체 가로 스크롤 및 좌우 이동 버튼을 제공하며, 상위 테이블 스크롤과 독립적으로 움직입니다.


## v0.20.0 월간 납품 일정 표시 항목 설정

`/deliveries` 월간 달력에서 **계약상 납기**, **입고 예정일**, **실제 납품일**을 복수선택할 수 있습니다. 기본값은 모두 표시이며, 선택값은 브라우저 `localStorage` (`gsem.calendar.visibleEventTypes.v1`)에 저장됩니다.

- 계약상 납기: `Sub_Contract.delivery_date_contract` 기준, 차수별 1건
- 입고 예정일: `Match_Sub_Contract_Item.date_receiving_expect` 기준, 매칭 행별 1건
- 실제 납품일: `Match_Sub_Contract_Item.date_deliver` 기준, 매칭 행별 1건
- 새로 추가된 조회 API: `GET /api/v1/delivery-calendar/events?businessIds=1&dateFrom=2026-11-01&dateTo=2026-11-30`
- 날짜를 선택하면 해당 날짜에 속한 이벤트의 사업명, 납품 차수, 부대, 품번, 품명, 수량을 확인할 수 있습니다.
- `납품완료된 차수 숨김`은 이벤트 종류와 관계없이 해당 차수의 모든 이벤트에 적용됩니다.

해당 API는 조회 전용이며 DB를 수정하지 않습니다. 기존 `GET /api/v1/delivery-rounds` 집계 API와는 독립적으로 날짜 종류별 월간 범위를 조회하므로, 계약상 납기가 다른 달에 있어도 해당 달의 품목별 입고·납품 이벤트가 표시됩니다.


### v0.20.0 월간 일정 404 확인 (개발망)

현재 달력 전용 라우터는 `backend/app/api/delivery_calendar.py`에 있으며,
`backend/app/main.py`가 `delivery_calendar_router`를 등록합니다.
이 파일만 복사하지 말고 **동일한 커밋의 backend 폴더 전체**를 반입해야 합니다.

```powershell
# 프로젝트 루트에서: 현재 로컬 코드가 달력 라우트를 등록하는지 확인
Test-Path .\backend\app\api\delivery_calendar.py
.\.venv\Scripts\python.exe -c "from backend.app.main import app; print([r.path for r in app.routes if 'delivery-calendar' in r.path])"

# 현재 4010 포트에 실행 중인 API 확인
(Invoke-RestMethod http://127.0.0.1:4010/openapi.json).paths.PSObject.Properties.Name |
    Select-String 'delivery-calendar/events'
```

파일이 있고 로컬 Python에서 라우트가 표시되지만 HTTP OpenAPI에는 없으면,
현재 4010 포트에서 구버전 프로세스가 실행 중일 수 있습니다. FastAPI 재시작이 필요합니다.
정상적으로 라우트가 등록된 서버도 SQL Server 연결 설정이 없다면 404가 아닌 503을 반환합니다.


월간 일정은 기존 `delivery-rounds` 조회와 별도로 **신규 API**
`GET /api/v1/delivery-calendar/events?dateFrom=2026-11-01&dateTo=2026-11-30&businessIds=101`를 사용합니다.
통합현황은 정상인데 일정만 404라면 프론트 파일만 갱신하고
FastAPI 백엔드를 이전 버전으로 실행 중인 경우가 많습니다.

```powershell
# FastAPI를 실행한 PC에서, 기존 프로세스 종료 후 프로젝트 루트에서 재실행
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 4010

# 라우트 확인: 결과에 /api/v1/delivery-calendar/events가 있어야 함
(Invoke-RestMethod http://127.0.0.1:4010/openapi.json).paths.PSObject.Properties.Name |
    Select-String 'delivery-calendar/events'
```

포트 4010을 점유한 **다른 Python 프로세스**가 존재하는지도 확인합니다.
정확히 연결된 환경에서는 HTTP 404가 아니라 정상 JSON (또는 입력 미비 시 4xx 유효성 오류)이 반환됩니다.
프론트만 `npm run build`해도 서버에 새 엔드포인트가 추가되지는 않습니다.


### 화면별 필터·테이블 설정 저장 (v0.20.0)

- 브라우저 `localStorage`의 `gsem.preferences.v1.<page>.<name>` 키로 페이지별 필터를 독립적으로 유지합니다.
- 지원 페이지: 지원장비 통합현황, 납품 일정, 장비 검색(URL 쿼리 우선), 장비 마스터, 변경 신청 및 변경 이력.
- 통합현황의 상·하위 테이블 열 너비는 필터와 별개로 저장되며 `열 너비 초기화` 버튼으로 복원할 수 있습니다.
- 헤더 셀 오른쪽 경계선을 드래그해 너비를 변경하고, 더블클릭하면 현재 표시된 셀의 텍스트 너비 기준으로 자동 조절합니다.
- localStorage에는 필터/표시 옵션만 저장하고 조회 결과·SQL Server 데이터는 저장하지 않습니다. 계정이 도입되면 동일한 페이지별 설정 키를 서버 사용자 설정에 매핑할 수 있습니다.
- 오래된 브라우저 설정이나 잘못된 값은 안전하게 무시합니다. 로컬 설정은 기기·브라우저 간 공유되지 않습니다.
