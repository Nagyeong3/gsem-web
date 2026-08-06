# FastAPI 백엔드 전환 기록

## 결론

기존 Node `.mjs` 인메모리 백엔드를 FastAPI로 교체했다. 대시보드, 장비 검색·상세, 납품 일정, 변경 신청, 5단계 대체 이력과 프론트 Mock/API 전환은 그대로 유지한다. 실제 MS Access, 인증, 운영 승인과 배포는 이번 범위가 아니다.

## 선택 이유

- Python 기반 업무 로직과 향후 데이터 처리 코드를 사용자가 직접 유지하기 쉽다.
- FastAPI의 요청 검증과 자동 OpenAPI 문서로 프론트 계약의 누락을 줄일 수 있다.
- Router–Service–Repository를 분리해 인메모리 데이터를 실제 DB Adapter로 교체할 수 있다.
- Pytest와 TestClient로 HTTP 오류, 필터, 페이징과 복수 관계를 빠르게 회귀검사할 수 있다.

## 구조

```text
frontend/src
└─ Service 인터페이스 → Mock Adapter 또는 HTTP Adapter

backend/app
├─ api/router.py                HTTP Endpoint와 Query 검증
├─ services/gsem_service.py     검색·필터·정렬·페이징
├─ repositories/base.py        Repository 계약
├─ repositories/memory.py      JSON 기반 인메모리 구현
├─ repositories/access.py      향후 MS Access Adapter 위치
├─ core/                        설정·오류·요청 ID·로그
└─ main.py                      FastAPI 앱 조립
```

## 보존한 API 계약

- 기존 일곱 조회 Endpoint와 `/api/v1` Prefix
- 품목 하나당 검색 결과 한 행
- 복수 사업·기종·계통·납지·담당자 배열
- `page`가 1부터 시작하는 페이징
- `data`, `page`, `meta.requestId` 성공 응답
- `error.code`, `error.message`, `error.fieldErrors`, `error.traceId` 오류 응답
- `X-Request-ID`, 개발 CORS와 `Cache-Control: no-store`
- 대시보드 `12 = 3 + 5 + 4`

## 실행

```bash
python -m venv .venv
# Windows
.venv\Scripts\python -m pip install -r requirements-dev.txt
# macOS/Linux
.venv/bin/python -m pip install -r requirements-dev.txt

npm install
npm run server:dev
```

별도 터미널에서 `npm run dev`를 실행하거나, FastAPI와 API 모드 프론트를 함께 실행하려면 `npm run dev:api`를 사용한다.

## 검증

```bash
npm run lint:backend
npm run test:backend
npm run test:contract
npm run test
npm run test:e2e
npm run test:e2e:api
```

전환 작업의 로컬 검수 결과는 다음과 같다.

- Python Ruff: 오류·경고 0건
- FastAPI Repository·HTTP·런타임 OpenAPI 테스트: 10건 통과
- OpenAPI 문서 계약 테스트: 3건 통과
- 프론트 단위·FastAPI HTTP 통합 테스트: 33건 통과
- TypeScript와 ESLint: 통과
- 프로덕션 빌드: 통과
- Mock 모드 1440×900 브라우저 시나리오: 12건 통과
- FastAPI 모드 브라우저 시나리오: 2건 통과
- 라이트·다크 화면 디자인은 변경하지 않았으며 기존 화면 캡처와 시나리오를 그대로 사용해 회귀검사했다.

변환 중 자동검사에서 납품의 `applications[].deliveries[]` 중첩, 영문 상태 코드와 대시보드 DTO 필드 불일치를 발견했고 기존 API 계약과 일치하도록 수정한 뒤 전체 검사를 다시 통과했다.

## 프로토타입 가정과 미확정

- 납품 상태 `예정·진행·완료`와 변경 처리 상태는 프로토타입 가정이다.
- `from`, `to` 날짜 조건의 실제 포함 범위 규칙은 미확정이므로 기존 화면 동작을 유지한다.
- 품목 담당자는 품목 단위이며 복수 배정 가능성을 배열로 보존한다. 정·부 저장 필드는 미확정이다.
- 관리 품목 유형의 실제 DB 저장 위치는 미확정이다.
- 실제 DB 연결 시 날짜 형식, NULL, 코드값, 한글 정렬, 중복 제거와 동시성을 다시 검증해야 한다.

## 실제 DB 연결의 첫 작업

`GsemRepository` 계약을 구현하는 MS Access Adapter를 별도 모듈로 만든다. Router나 프론트 DTO를 DB 행 구조에 직접 연결하지 않고, Adapter에서 `Integrated_Info`와 Match 테이블의 중복 행을 품목 중심 배열로 집계한다.
