# 프론트 데이터 모델 설계

## 1. 목적

현재 React 프로토타입 타입과 향후 API DTO의 책임을 구분한다. DB 스키마나 API 응답이 변경되더라도 화면 컴포넌트 변경을 최소화하는 것이 목표다.

## 2. 모델 계층

### API DTO

경로:

```text
src/types/api.ts
```

책임:

- HTTP 요청과 응답의 직렬화 가능한 구조
- 서버 코드값과 식별자 보존
- 페이징과 오류 규격
- DB Entity를 직접 노출하지 않는 화면용 집계 응답

### View Model

현재 경로:

```text
src/types/domain.ts
```

책임:

- React 화면이 바로 사용할 수 있는 형태
- 한글 표시 상태와 디자인 Tone
- 차트 및 표 구성에 적합한 데이터
- Mock Service와 현재 프로토타입 동작 유지

현재 `domain.ts`의 `Equipment`는 엄밀한 Domain Entity가 아니라 화면 조회 모델에 가깝다. 이번 단계에서는 기존 코드를 대규모 변경하지 않기 위해 파일명과 타입명을 유지한다. 실제 HTTP Adapter 도입 시 `viewModels` 디렉터리로 이동하는 방안을 검토한다.

## 3. 핵심 매핑

### 품목 목록

| API DTO | 현재 View Model | 변환 |
|---|---|---|
| `itemNumber` | `itemNum` | 이름 변경 |
| `itemNameKor` | `itemNameKor` | 그대로 |
| `itemNameEng` | `itemNameEng` | 값 없음은 빈 문자열 또는 `-` 표시 |
| `category` | `category` | 그대로 |
| `vendor.name` | `manufacturer` | 현재 View Model 명칭과 다르므로 업체명만 추출 |
| `subsystems` | `systems` | 이름 변경 |
| `maintenanceLevels` | `maintenanceLevels` | 그대로 |
| `businesses`, `aircraftTypes` | `applications` | 목록 DTO만으로 완전 복원 불가 |
| `managers` | `managers` | 역할 코드와 정·부 코드를 한글 표시값으로 변환 |
| `status` | `status` | 서버 코드 → 한글 표시 상태 |
| `recentChangeDate` | `recentChangeDate` | 값 없음 처리 필요 |

현재 View Model은 사업과 기종을 `applications`로 묶는다. 목록 API에서 사업·기종의 정확한 조합이 필요하면 `ItemSummaryDto`도 `applications` 요약 배열로 변경해야 한다. 현재 표는 사업과 기종을 각각 요약하므로 독립 배열로 가정했다.

### 품목 상세

`ItemDetailDto.applications`는 `Integrated_Info`에 대응하는 사업 적용 단위다. 각 항목 아래에 납품 목록을 둔다.

```text
ItemDetailDto
└─ applications[]
   ├─ integratedInfoId
   ├─ business
   ├─ aircraftType
   └─ deliveries[]
```

이 구조는 현재 `Equipment.applications`와 정합성이 높아 Mapper 구현이 단순하다.

### 대시보드

| API DTO | 현재 View Model | 변환 |
|---|---|---|
| `plannedQuantity` | `plan` | 이름 변경 |
| `deliveredQuantity` | `actual` | 이름 변경 |
| `achievementRate` | `achievement` | 이름 변경 |
| `recentChanges` | `changes` | 필드명과 상태 표시 변환 |
| `upcomingDeliveries` | `upcomingDeliveries` | 식별자는 현재 화면에서 사용하지 않음 |
| 대문자 Metric/Tone 코드 | 소문자 ID/Tone | 명시적 매핑 |

## 4. Mapper 원칙

HTTP Adapter 도입 시 다음 구조를 권장한다.

```text
src/
├─ services/
│  ├─ dashboardService.ts
│  ├─ equipmentService.ts
│  └─ http/
│     ├─ apiClient.ts
│     ├─ httpDashboardService.ts
│     └─ httpEquipmentService.ts
├─ mappers/
│  ├─ dashboardMapper.ts
│  └─ equipmentMapper.ts
├─ types/
│  ├─ api.ts
│  └─ domain.ts
```

Mapper는 다음을 수행한다.

- 서버 코드 → 화면 한글 표시값
- Nullable 값 → 빈 상태 표현
- DTO 필드명 → View Model 필드명
- 중첩 관계 → 화면 조회 구조
- 알 수 없는 코드 → 안전한 기본 표시 또는 오류 기록

컴포넌트에서 직접 DTO를 변환하지 않는다.

## 5. 서비스 인터페이스 개선안

현재:

```ts
interface EquipmentService {
  getAll(): Promise<Equipment[]>;
  getById(itemId: number): Promise<Equipment | undefined>;
}
```

향후:

```ts
interface EquipmentService {
  search(request: EquipmentSearchRequest): Promise<PageResult<Equipment>>;
  getById(itemId: number): Promise<Equipment>;
  getFilterOptions(): Promise<EquipmentFilterOptions>;
}
```

현재 `getAll()`을 즉시 제거하지 않는다. HTTP Adapter 도입 PR에서 검색 상태 관리와 함께 교체한다.

## 6. 검색 상태 모델

현재 `EquipmentFilters`는 화면 입력 상태다. API 요청 DTO와 직접 공유하지 않는다.

```text
EquipmentFilters
        ↓ toItemSearchQuery()
ItemSearchQueryDto
        ↓ URLSearchParams
GET /api/v1/items
```

필요한 변환:

- 화면 표시명 → 코드 또는 ID
- 빈 문자열 → Query Parameter 생략
- 페이지 UI Index → API 1-base Page
- 화면 정렬키 → API 정렬 필드

## 7. Null과 빈 배열

- 복수 관계가 없으면 `null`이 아니라 빈 배열 `[]`을 사용한다.
- 선택 정보가 없으면 해당 선택 필드는 생략할 수 있다.
- 숫자 `0`과 값 없음은 구분한다.
- 날짜가 없을 때 빈 문자열을 사용하지 않고 필드를 생략한다.
- API Mapper 이후 화면에서는 `-` 같은 표시값을 적용한다.

## 8. 코드값 처리

프론트는 서버 코드값을 임의로 한글로 변환하는 분산 `switch` 문을 만들지 않는다.

초기에는 Mapper의 중앙 Map을 사용하고, 공통코드 API와 권한 정책이 확정되면 다음 중 하나를 선택한다.

1. API가 코드와 표시명을 함께 반환
2. 공통코드 API를 한 번 조회하여 캐시
3. 배포 시점에 고정된 코드만 프론트 상수로 관리

## 9. 현재 코드와의 정합성 결과

| 검토 항목 | 결과 |
|---|---|
| 품목당 한 행 | 현재 검색 로직과 API 목록 계약 일치 |
| 복수 사업·기종 | 현재 View Model에서 지원 |
| 복수 계통·정비 계단 | 현재 View Model에서 지원 |
| 복수 담당자 | 현재 View Model에서 지원 |
| 사업별 납품 | 현재 상세 View Model에서 지원 |
| 서버 페이징 | 현재 미구현, HTTP 전환 단계에서 필요 |
| 필터 코드/ID 사용 | 현재 표시명 기반, Mapper 필요 |
| 관리 품목 유형 | 요구사항에는 있으나 현재 ERD 저장 위치가 없어 `itemType`은 선택값 |
| SERD·품보·교정 | 현재 상세 View Model에 없음 |
| 단종·대체 Graph | 현재 타입과 화면 미구현 |
| 공통 오류 | 현재 페이지별 처리, HTTP Client 도입 시 통합 필요 |

## 10. 의도적으로 변경하지 않은 코드

이번 작업은 계약 설계 단계이므로 다음을 변경하지 않는다.

- 기존 화면 컴포넌트
- 기존 Mock Fixture
- 기존 `EquipmentService` 동작
- 검색·정렬 로직
- 라우팅

`src/types/api.ts`는 아직 화면에서 Import하지 않는다. 계약 검토 후 HTTP Adapter 구현 시 연결한다.
