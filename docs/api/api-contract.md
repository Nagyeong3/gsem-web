# GSEM API 계약 초안

## 1. 목적과 범위

이 문서는 요구사항 001~026, 현재 ERD 설명, 정적 시안 및 React 프로토타입을 대조하여 프론트엔드와 백엔드 사이의 조회 계약을 정의한다.

이번 단계에서는 다음을 하지 않는다.

- 실제 백엔드 프레임워크 확정
- 실제 DB 또는 MS Access 연결
- DB 테이블과 API 응답의 일대일 결합
- 인증·인가 구현
- 변경 승인, 파일 저장, 메일 발송, Import·Export 구현

API는 DB 구조가 변경되더라도 화면 계약이 가능한 한 유지되도록 설계한다.

## 2. 상태 표기

- **확정**: 사용자 또는 요구사항 문서에서 명시적으로 확인된 규칙
- **가정**: 프로토타입과 계약 검토를 위해 임시로 선택한 규칙
- **미확정**: 현업 또는 DB 담당자와 추가 확인이 필요한 규칙

## 3. 핵심 설계 결정

### 3.1 대표 자원명은 `items`

**설계 결정**

화면명은 현재 승인된 `장비 검색`을 유지하지만 API 대표 자원은 `/items`를 사용한다.

**근거**

요구사항 008에서 지원장비 외에 기본불출품목, 조종장구류 점검장비, 표준기도 관리 대상으로 확정됐다. `/equipment`를 대표 자원으로 사용하면 네 유형 전체를 포괄하기 어렵다.

### 3.2 DB Entity, API DTO, View Model 분리

```text
DB Entity
Item + Integrated_Info + Business + Match_* + Contract_Delivery
        ↓ 백엔드 조회·집계
API DTO
ItemSummaryDto / ItemDetailDto / DashboardOverviewDto
        ↓ 프론트 API Adapter·Mapper
View Model
Equipment / DashboardData
        ↓
React 화면
```

프론트는 `Integrated_Info`, `Match_Item_SubSystem` 같은 DB 테이블 구조를 직접 알지 않는다. 백엔드는 목록 조회 시 복수 관계를 집계하여 품목 하나당 한 객체를 반환한다.

### 3.3 목록은 품목 하나당 한 행

**확정**

- 한 품목은 여러 사업, 기종, 계통, 정비 계단을 가질 수 있다.
- 담당자는 정·부 개념으로 여러 명까지 확장될 수 있다.
- 검색 결과는 품목 하나당 한 행이다.

따라서 목록 DTO는 복수 관계를 배열로 반환하며 프론트에서 대표값과 `외 N개/명`으로 표시한다.

### 3.4 목록 조회는 서버 검색·정렬·페이징 기준

**가정**

운영 데이터 규모가 커질 가능성을 고려하여 `/items`는 서버 검색, 필터, 정렬, 페이징 방식으로 설계한다. 현재 프로토타입의 클라이언트 필터는 Mock Adapter의 구현 방식일 뿐 운영 계약으로 확정하지 않는다.

### 3.5 상태값은 코드와 표시명 분리

**가정**

API는 안정적인 영문 코드값을 반환하고 한글 표시명은 코드 API 또는 응답의 Label로 제공한다. 현재 프로토타입 상태값은 운영 코드가 아니다.

| 영역 | 임시 API 코드 | 현재 화면 표시 | 상태 |
|---|---|---|---|
| 품목 | `IN_USE` | 사용 중 | 가정 |
| 품목 | `REPLACEMENT_REVIEW` | 대체 검토 | 가정 |
| 품목 | `ON_HOLD` | 보류 | 가정 |
| 납품 | `PLANNED` | 예정 | 가정 |
| 납품 | `IN_PROGRESS` | 진행 | 가정 |
| 납품 | `COMPLETED` | 완료 | 가정 |
| 변경 | `RECEIVED` | 접수 | 가정 |
| 변경 | `IN_REVIEW` | 검토 중 | 가정 |
| 변경 | `PROCESSED` | 처리 완료 | 가정 |

## 4. 공통 규칙

### 4.1 기본 경로

```text
/api/v1
```

### 4.2 날짜와 시간

- 날짜: ISO 8601 `YYYY-MM-DD`
- 일시: ISO 8601 DateTime과 시간대 포함
- 서버와 DB의 저장 시간대는 미확정

### 4.3 성공 응답

단건:

```json
{
  "data": {},
  "meta": {
    "generatedAt": "2026-07-31T10:00:00+09:00",
    "traceId": "trace-placeholder"
  }
}
```

목록:

```json
{
  "data": [],
  "page": {
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  },
  "meta": {
    "generatedAt": "2026-07-31T10:00:00+09:00"
  }
}
```

### 4.4 오류 응답

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청 조건을 확인해주세요.",
    "fieldErrors": [
      {
        "field": "size",
        "reason": "1 이상 100 이하여야 합니다."
      }
    ],
    "traceId": "trace-placeholder"
  }
}
```

예상 오류 코드는 다음과 같다.

| HTTP | 코드 | 의미 |
|---:|---|---|
| 400 | `INVALID_REQUEST` | 형식, 필터 또는 정렬 조건 오류 |
| 401 | `UNAUTHENTICATED` | 인증 필요, 실제 인증 방식 미확정 |
| 403 | `FORBIDDEN` | 조회 권한 없음, 권한 규칙 미확정 |
| 404 | `ITEM_NOT_FOUND` | 요청한 품목이 없음 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |
| 503 | `DATA_SOURCE_UNAVAILABLE` | DB 또는 연계 데이터 소스 사용 불가 |

## 5. 1차 핵심 API

### 5.1 대시보드 조회

```http
GET /api/v1/dashboard/overview
```

**용도**

- 주요 지표
- 월별 납품 계획 대비 실적
- 최근 변경 이력
- 납품 임박 품목

**가정**

- 1차 계약에서는 한 번의 요청으로 현재 화면 전체 데이터를 반환한다.
- 실제 집계 기준일, 개인/전사 범위, 납품 지연 계산은 미확정이다.
- `확인이 필요한 업무 12건 = 납품 지연 3 + 단종·대체 검토 5 + 변경 승인 대기 4`는 프로토타입 고정 규칙이다.

### 5.2 검색 필터 선택지 조회

```http
GET /api/v1/items/filter-options
```

검색 화면에서 사용하는 기종, 사업, 계통, 품목 유형, 담당자, 납지 및 상태 선택지를 반환한다.

납지는 공통코드가 아니라 `Delivery_Destination.delivery_dest_id`를 사용하므로 `{ destinationId, name }` 형태로 반환한다.

**설계 이유**

프론트가 공통코드 값과 표시명을 하드코딩하지 않도록 한다. 단, 항목 간 종속 필터가 필요한지는 미확정이다.

### 5.3 품목 목록 검색

```http
GET /api/v1/items
```

지원 Query Parameter:

| 이름 | 형식 | 의미 | 상태 |
|---|---|---|---|
| `query` | string | 품번·국영문 품명·국영문 용도 통합 검색 | 부분 확정 |
| `itemType` | enum | 관리 품목 유형, 현재 ERD 저장 위치 없음 | 요구사항 확정·저장 미정 |
| `aircraftTypeCode` | string | 적용 기종 | 확정 |
| `businessId` | integer | 적용 사업 | 확정 |
| `subsystemCode` | string | 적용 계통 | 확정 |
| `categoryCode` | string | 장비구분 | 확정 |
| `managerUserId` | integer | 담당자 | 부분 확정 |
| `destinationId` | integer | 납지 | 부분 확정 |
| `status` | enum | 사용·획득 상태 | 미확정 |
| `sort` | `field,direction` | 정렬 | 가정 |
| `page` | integer | 1부터 시작하는 페이지 | 가정 |
| `size` | integer | 페이지 크기, 기본 20, 최대 100 | 가정 |

기본 정렬은 `recentChangeDate,desc`로 가정한다.

**검색 미확정 사항**

- 부분 일치와 전방 일치의 구분
- 공백, 하이픈, 대소문자 정규화
- SERD 번호와 연관 품번 포함 여부
- 다중 필터값 허용 여부
- 복수값 정렬 시 대표값 선정 규칙

### 5.4 품목 통합 상세

```http
GET /api/v1/items/{itemId}
```

다음 정보를 하나의 화면용 응답으로 조합한다.

- 품번과 국·영문 품명·용도
- 관리 품목 유형과 장비구분
- 업체
- 적용 사업과 기종
- 계통과 정비 계단
- 담당자
- 사업별 납품정보
- SERD
- 품보 형태
- 교정정보
- 단종·대체 관계 요약

ERD에 아직 없는 정보는 값이 없을 수 있다. 필드 존재 여부와 값 없음은 구분한다.

## 6. 후속 화면 API

아래 API는 요구사항과 추가 정적 시안에 대응하는 조회 계약이며 1차 백엔드 구현 대상은 아니다.

### 6.1 납품 일정 목록

```http
GET /api/v1/deliveries
```

예상 조건:

- 기간
- 사업
- 기종
- 납지
- 납품 상태
- 담당자
- 검색어
- 정렬과 페이징

현재 프로토타입 화면은 계획·발주·입고·납품 수량을 구분한다. `plannedQuantity`를 기준 필드로 사용하고, 기존 ERD의 `quantity`는 전환 기간 호환 필드로만 둔다. 나머지 수량의 실제 원천은 미확정이다.

**미확정**

- 계획·발주·입고·납품 수량의 개별 관리 여부
- 부분 납품 처리
- 지연 자동 판정 기준
- DB 컬럼명은 `*_month`지만 값은 `YYYY-MM-DD` 날짜

### 6.2 변경 이력 목록과 상세

```http
GET /api/v1/change-events
```

일반 속성 변경, 담당자 변경, 단종·대체, 수리·하자·형상변경은 화면에서 함께 조회할 수 있으나 사건 유형은 구분한다.
현재 상세 패널은 목록 응답에서 선택한 사건을 사용하며 별도 단건 Endpoint는 아직 확정하지 않는다.

**미확정**

- 변경 신청과 실제 반영 이력의 분리
- 상태 전이
- 승인자와 처리자 구분
- 변경 근거의 자료 연결 방식

### 6.3 대체품 계보

```http
GET /api/v1/items/{itemId}/replacement-graph
```

노드와 Edge 목록을 반환하여 프론트에서 그래프로 렌더링한다. 중첩 객체 트리 대신 Graph 구조를 사용해 분기와 합류를 모두 표현한다.

**확정**

- 단종품 하나에 여러 대체품이 존재할 수 있다.
- 대체 관계를 일대일로 단정하지 않는다.

**미확정**

- 하나의 대체품이 여러 단종품을 대체할 수 있는지
- 사업별 대체 관계
- 관계 적용 시작일·종료일
- 순환 관계 허용 여부와 검증 방식

## 7. ERD 매핑 기준

| API 개념 | 현재 ERD 후보 | 매핑 판단 |
|---|---|---|
| 품목 기본정보 | `Item` | 직접 조회 후보 |
| 관리 품목 유형 | 현재 ERD에 없음 | 요구사항은 확정됐으나 저장 위치는 추후 추가 |
| 장비구분 | `Item.code_CATEG`, `Common_Code_Detail` | `CATEG`: 일반공구·특수공구·시험장비 등 |
| 업체 | `Item.bender_id`, `Bender` | 확인된 컬럼은 `bender_id`, `bender_name`이며 제조사·구매처 구분은 미정 |
| 사업 적용 | `Integrated_Info`, `Business` | `item_id`, `business_id`로 조합 |
| 기종 | `Business.code_ATYPE`, 공통코드 | 사업에 종속된 기종으로 현재 해석 |
| 계통 | `Match_Item_SubSystem`, 공통코드 | 품목별 복수 관계 |
| 정비 계단 | `Match_Item_LevelOfMaintenance`, 공통코드 | 품목별 복수 관계 |
| 납품 | `Contract_Delivery`, `Delivery_Destination` | `integrated_id` 기준 사업 적용별 복수 관계 |
| 담당자 | `Match_Managing_User`, `User` | 품목 단위로 집계하며 물리적으로 사업 연계정보마다 반복 저장 |

### 공통코드 구조

`Common_Code_Detail`은 `code`, `group_code`, `code_name`, `sort_order`, `is_used`로 구성된다.

| `group_code` | 의미 | 연결 필드 |
|---|---|---|
| `ATYPE` | 기체 | `Business.code_ATYPE` |
| `CATEG` | 장비구분 | `Item.code_CATEG` |
| `LOM` | 정비계단 | `Match_Item_LevelOfMaintenance.code_LOM` |
| `SSYST` | 계통 | `Match_Item_SubSystem.code_SSYST` |

필터 선택지는 `is_used=1`인 상세 코드를 `sort_order` 순서로 제공한다.

### 담당자 저장과 API 집계

- 업무 규칙상 담당자는 품목 단위이며 한 품목에 여러 명이 배정될 수 있다.
- 현재 DB는 `Match_Managing_User.integrated_id`로 연결되므로 같은 품목이 여러 사업에 속하면 동일 담당자가 각 `Integrated_Info`에 반복 저장된다.
- API는 `item_id`, `user_id` 기준으로 중복을 제거하여 품목 단위 담당자 배열로 반환한다.
- `role`은 Nullable이며 정·부 구분은 현재 DB에 반영되지 않았다.
- 저장 구조는 ERD 확정 과정에서 변경될 수 있으므로 API가 중복 저장 방식을 노출하지 않는다.

### `Integrated_Info` 유일성

`item_id`, `business_id` 조합 Index가 확인됐으나 Unique 여부는 확인되지 않았다. 동일 품목·사업 조합이 여러 번 존재할 수 있는지 확정 전까지 API는 `integratedInfoId`를 별도 식별자로 유지한다.

## 8. 성능·보안 기준 초안

- 목록 응답은 필요한 요약 필드만 반환하고 상세 필드는 상세 API에서 조회한다.
- 목록 조회 과정에서 복수 관계 Join으로 품목이 중복되지 않아야 한다.
- 최대 페이지 크기는 100으로 가정한다.
- 실제 직원 연락처, 이메일, 부서정보는 현재 API 계약에서 제외한다.
- 검색어와 정렬 필드는 허용 목록으로 검증한다.
- DB 테이블명과 내부 오류 메시지를 외부 응답에 노출하지 않는다.
- 인증·권한 확정 후 역할별 필드 노출 규칙을 별도로 추가한다.

## 9. 구현 순서

1. 본 계약과 미확정 질문 검토
2. 백엔드 기술과 API 문서 생성 방식 확정
3. `MockEquipmentService`와 동일한 인터페이스의 HTTP Adapter 작성
4. DTO → View Model Mapper 작성
5. `/items`, `/items/{itemId}`, `/dashboard/overview`부터 구현
6. Mock/API 전환 환경변수 적용
7. 실제 ERD·MS Access 연결 시 Repository 매핑
8. Contract Test로 OpenAPI와 실제 응답 검증
