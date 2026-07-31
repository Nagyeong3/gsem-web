# API 계약 검토 기록

## 1. 검토 대상

- `AGENTS.md`
- `docs/requirements/requirements-draft.md`
- `docs/requirements/requirements-analysis.md`
- `docs/requirements/open-questions.md`
- `docs/development/prototype-architecture.md`
- `src/types/domain.ts`
- `src/services/dashboardService.ts`
- `src/services/equipmentService.ts`
- `src/features/equipment-search/equipmentSearch.ts`
- `src/mocks/dashboard.ts`
- `src/mocks/equipment.ts`

## 2. 요구사항 연결

| API | 연결 요구사항 | 1차 구현 우선순위 |
|---|---|---|
| `GET /dashboard/overview` | 003, 007, 009, 010, 011 | 높음 |
| `GET /items/filter-options` | 004, 008, 012, 014, 015, 016 | 높음 |
| `GET /items` | 001, 003, 004, 008, 014, 015, 016 | 높음 |
| `GET /items/{itemId}` | 001, 002, 003, 010, 011, 017, 018, 019 | 높음 |
| `GET /deliveries` | 002, 009, 011 | 후속 |
| `GET /change-events` | 003, 007, 010, 025 | 후속 |
| `GET /items/{itemId}/replacement-graph` | 001, 003, 007, 021, 025 | 후속 |

## 3. 발견한 불일치와 처리

### 관리 품목 유형과 장비 분류

- 요구사항 008은 네 가지 관리 품목 유형을 요구한다.
- 현재 타입과 Mock은 `category`만 관리한다.
- `시험장비`, `일반공구`, `특수공구`, `표준기`는 장비 분류와 관리 품목 유형이 혼재할 가능성이 있다.

**처리**

API DTO에는 `itemType`과 `category`를 분리했다. 실제 `code_CATEG`가 어느 개념인지 확인이 필요하다.

### 담당자 연결 기준

- 현재 프로토타입은 담당자를 품목에 직접 배열로 둔다.
- ERD는 `Match_Managing_User.integrated_id`로 보여 사업 적용별 연결 가능성이 있다.

**처리**

목록과 상세 응답에서는 품목 단위 배열로 집계한다. 실제 저장 기준은 미확정으로 유지한다.

### 검색 실행 위치

- 현재 프로토타입은 모든 Fixture를 받은 후 브라우저에서 검색·정렬·페이징한다.
- 운영 규모와 전사 사용을 고려하면 서버 처리 가능성이 높다.

**처리**

API는 서버 처리 방식으로 설계했으며 현재 Mock 구현은 유지한다.

### 사업과 기종 관계

- 현재 `Business.code_ATYPE`로 사업에 기종이 연결된 것으로 보인다.
- 요구사항은 장비의 복수 사업과 복수 기종을 각각 강조한다.

**처리**

상세에서는 `BusinessApplicationDto`로 조합을 보존하고 목록에서는 각각 배열로 요약한다. 사업 하나에 여러 기종이 가능한지는 미확정이다.

### 납품 날짜

- ERD 필드명은 `delivery_month`, `receipt_month`로 보인다.
- 화면은 날짜 단위 예정일을 사용한다.

**처리**

API 초안은 ISO 날짜로 가정했다. 실제 데이터가 월 단위라면 계약 변경이 필요하다.

## 4. 확정 내용

- 품목 하나는 여러 사업에 포함될 수 있다.
- 품목 하나는 여러 기종, 계통, 정비 계단에 적용될 수 있다.
- 검색 결과는 품목 하나당 한 행이다.
- 담당자는 정·부 복수 확장을 고려한다.
- 지원장비 담당자와 구매 담당자 역할을 고려한다.
- 대체 관계는 일대일로 단정하지 않는다.
- 실제 승인 처리, 로그인, DB 연동, 다운로드는 현재 구현 범위가 아니다.

## 5. 프로토타입 가정

- REST API와 `/api/v1` 경로
- 1-base 페이지와 기본 크기 20
- 서버 검색·정렬·페이징
- ISO 날짜와 일시
- 영문 상태 코드
- 대시보드 통합 응답
- 품목·납품 임시 상태값
- 최대 페이지 크기 100

## 6. 구현 전에 반드시 확인할 질문

1. `code_CATEG`는 관리 품목 유형인가, 장비 구분인가, 둘을 함께 나타내는가?
2. 담당자는 품목 전체 기준인가, `Integrated_Info`에 따른 사업별 기준인가?
3. `delivery_month`, `receipt_month`는 실제 날짜인가 월 단위 값인가?
4. 장비 검색의 검색어는 품번·품명·용도 외에 SERD 번호와 연관 품번도 포함하는가?
5. 사업 하나에 기종이 하나만 연결되는가, 여러 기종이 연결될 수 있는가?
6. 실제 품목 상태와 납품 상태의 코드·표시명·전이 순서는 무엇인가?
7. `item_id`, `business_id` Index는 Unique인가?
8. 페이지·정렬·필터를 서버에서 처리할 수 있는 백엔드 환경인가?

## 7. 최종 판정

- 요구사항과 API Endpoint 연결: 통과
- ERD Entity 직접 노출 방지: 통과
- 현재 View Model과 매핑 가능성: 통과
- 확정·가정·미확정 구분: 통과
- 실제 기밀정보 포함 여부: 통과
- 실제 백엔드 구현 착수 가능 여부: 핵심 미확정 질문 확인 후 가능

