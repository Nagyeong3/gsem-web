# Stub API 연결 검수 결과

## 검수 목적

실제 DB와 운영 백엔드를 확정하기 전에 OpenAPI 조회 계약, 프론트 HTTP Adapter, 개발 Proxy의 연결 가능성을 확인한다. 이 Stub API는 운영 백엔드 구현이 아니며 일반화한 목업 데이터만 사용한다.

## 구현 범위

| 구분 | 경로 | 결과 |
|---|---|---|
| 상태 확인 | `GET /health` | 통과 |
| 대시보드 | `GET /api/v1/dashboard/overview` | 통과 |
| 검색 조건 | `GET /api/v1/items/filter-options` | 통과 |
| 품목 검색 | `GET /api/v1/items` | 통과 |
| 품목 상세 | `GET /api/v1/items/{itemId}` | 통과 |
| 개발 Proxy | 프론트 `/api` → Stub `:4010` | 통과 |

## 자동 검수 결과

| 검수 항목 | 명령 | 결과 |
|---|---|---|
| Stub API 계약 | `npm run test:stub` | 7건 통과 |
| 프론트 단위 테스트 | `npm run test` | 12건 통과 |
| TypeScript | `npm run typecheck` | 통과 |
| ESLint | `npm run lint` | 통과 |
| 프로덕션 빌드 | `npm run build` | 통과 |
| OpenAPI 문법·내부 참조 | YAML 파싱 및 `$ref` 확인 | 경로 7개·참조 66개 통과 |
| 개발 Proxy 응답 | Vite를 거친 품목 검색 | 2건 요청·전체 12건·6페이지 확인 |

## 발견하고 수정한 문제

### 빈 검색 결과 페이지 번호

API 계약은 검색 결과가 없을 때 `totalPages: 0`을 반환할 수 있다. 화면의 페이지네이션은 최소 1페이지를 요구하므로 HTTP Adapter가 `page`와 `totalPages`를 1 이상으로 정규화하도록 수정하고 단위 테스트를 추가했다.

### Mock과 Stub의 기본 건수

기존 화면의 기본 검색 결과는 12건이다. API 모드에서도 같은 사용자 흐름을 검증할 수 있도록 Stub 품목을 일반화한 12건으로 맞추고, `나 사업` 필터 결과는 4건이 되도록 구성했다.

## 브라우저 검수 제약

Playwright API 모드 시나리오는 추가했다. 현재 작업 환경에서는 Chromium이 운영체제 소켓을 만들지 못해 브라우저 프로세스가 시작 전에 종료되어 시나리오 실행을 완료하지 못했다. API, Proxy, Adapter 단위 검수 실패가 아니라 실행 환경 제약이며, 로컬 PC에서는 다음 순서로 확인한다.

```bash
# 터미널 1
npm run stub:api

# 터미널 2
VITE_DATA_SOURCE=api npm run test:e2e -- e2e/http-adapter.spec.ts
```

## 프로토타입 가정

- 관리 품목 유형의 실제 DB 저장 위치는 미확정이다.
- 품목 상태 `사용 중`, `대체 검토`, `보류`는 화면 검증용 임시 값이다.
- 납품 상태의 의미는 `예정`, `진행`, `완료`이며 영문 API 코드는 설계값이다.
- 담당자 정·부 구분은 확장 후보이며 현재 DB 반영 여부를 확정하지 않는다.
- 운영 인증, 권한, 백엔드 기술, MS Access 연결 방식은 이번 작업에서 확정하지 않는다.

## 결론

조회 중심 1차 프로토타입은 Mock Adapter와 HTTP Adapter를 선택하여 실행할 수 있고, Stub API를 통해 서버 검색·정렬·페이징 및 상세 조회 계약을 검증할 수 있다. 실제 DB 연동 전 단계의 계약 검증 기준은 통과했으며, 로컬 브라우저 API 모드 시나리오 실행은 추가 확인이 필요하다.
