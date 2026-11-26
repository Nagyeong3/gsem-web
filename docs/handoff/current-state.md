# 프로젝트 현재 상태

## 기준 버전

- 최신 통합 개발본: `develop/prototype`
- 릴리즈 준비본: `release/prototype-v7`
- V7 성격: 실제 DB 연결 전 FastAPI 통합 기준본
- 화면 기준 해상도: 1440×900

## 구현된 화면

1. 메인 대시보드
2. 장비 검색
3. 장비 통합 상세
4. 납품 일정 관리
5. 변경 신청 및 처리 현황
6. 장비 변경 이력과 최소 5단계 대체품 계보

라이트·다크 모드, 로딩·오류·빈 결과·재시도, 검색·필터·정렬·페이징, URL 상태 복원과 Mock 역할 전환을 구현했다.

## 실행 구조

```text
React 페이지
→ 조회 Hook
→ Service 인터페이스
→ Mock Adapter 또는 HTTP Adapter
→ FastAPI Router
→ GsemService
→ InMemoryGsemRepository
→ 일반화한 JSON 목업 데이터
```

기본 프론트 모드는 `mock`이다. API 모드에서는 프론트가 FastAPI를 실제 HTTP로 호출하고 FastAPI가 JSON 목업 데이터를 응답한다.

## 실행 방법

```bash
npm install
python -m venv .venv

# Windows
.venv\Scripts\python -m pip install -r requirements-dev.txt

# macOS/Linux
.venv/bin/python -m pip install -r requirements-dev.txt
```

Mock 프론트만 실행:

```bash
npm run dev
```

FastAPI와 API 모드 프론트 동시 실행:

```bash
npm run dev:api
```

개별 실행 시 FastAPI는 `npm run server:dev`, 프론트는 `VITE_DATA_SOURCE=api` 설정 후 `npm run dev`를 사용한다. 상태 확인 주소는 `http://127.0.0.1:4010/health`다.

## 백엔드 구현 수준

프로토타입 범위에서 프론트–FastAPI HTTP 통신은 동작한다.

- Router–Service–Repository 분리
- 요청 Query 검증
- 공통 성공·오류 응답
- 요청 ID와 기본 로깅
- 개발 CORS와 캐시 방지
- 품목 검색·필터·정렬·페이징
- 품목 상세, 납품, 변경, 대체품 계보 조회
- Mock/API 데이터 공급자 전환
- OpenAPI 계약과 실제 Endpoint 경로 검증

운영 범위로는 완성되지 않았다.

- 실제 MS Access 연결 없음
- 실제 로그인·SSO 없음
- 운영 권한 없음
- 실제 승인·반려와 쓰기 트랜잭션 없음
- 사내 메일 연동 없음
- 운영 배포·모니터링 없음

## 검색 구조

Service가 전체 품목을 받은 뒤 필터링하지 않는다. 검색 조건·정렬·페이지를 `GsemRepository.search_items`로 전달한다. 인메모리 Repository는 목업 데이터를 순회하지만 향후 Access Adapter는 DB에서 `WHERE`, `EXISTS`, `ORDER BY`와 페이징을 수행할 수 있다.

## 검증 기준

```bash
npm run typecheck
npm run lint
npm run lint:backend
npm run test:backend
npm run test:contract
npm run test
npm run build
npm run test:e2e
npm run test:e2e:api
```

V7 준비 작업에서 백엔드 14건, OpenAPI 3건, 프론트 33건, Mock E2E 12건, FastAPI E2E 2건을 통과했다.

## 브랜치 규칙

- `main`: 사용자가 승인한 시연·공개본
- `develop/prototype`: 최신 통합 개발본
- `release/prototype-vN`: 버전별 변경 금지 스냅샷
- `agent/*`: 기능·검수 작업용 임시 브랜치이며 병합 후 삭제 대상

`main`과 기존 `release/*`에는 직접 개발하지 않는다.
