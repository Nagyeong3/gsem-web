# Mock·HTTP 전환 가이드

## 목적

실제 DB와 백엔드가 확정되기 전에도 화면 개발을 계속하고, 이후 화면 코드를 다시 작성하지 않고 HTTP API로 전환하기 위한 기준이다.

## 현재 구조

```text
DashboardPage / EquipmentSearchPage
              ↓
       Service 인터페이스
        ↙             ↘
 Mock Adapter       HTTP Adapter
      ↓                 ↓
   Fixture        ApiClient → API DTO
                         ↓
                       Mapper
                         ↓
                    화면 View Model
```

페이지는 `src/services/index.ts`가 내보내는 Service만 사용한다. Mock Fixture, `fetch`, API DTO를 페이지에서 직접 Import하지 않는다.

## 실행 모드

### 기본 Mock 모드

환경변수를 설정하지 않거나 다음 값을 사용한다.

```text
VITE_DATA_SOURCE=mock
VITE_API_BASE_URL=/api/v1
```

Mock Adapter도 검색·정렬·페이징을 Service 내부에서 처리하므로 HTTP 모드와 같은 호출 방식을 검증할 수 있다.

### HTTP API 모드

저장소에 포함하지 않는 `.env.local`에 다음 값을 설정한다.

```text
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

백엔드가 동일 출처의 `/api/v1`을 제공하거나 개발 Proxy를 구성하면 상대 경로를 유지할 수 있다.

## 연결되는 Endpoint

| 화면 | Method | Endpoint | 용도 |
|---|---|---|---|
| 대시보드 | GET | `/dashboard/overview` | 지표·납품 실적·최근 변경 조회 |
| 장비 검색 | GET | `/items/filter-options` | 필터 표시값과 코드·ID 조회 |
| 장비 검색 | GET | `/items` | 서버 검색·정렬·페이징 |
| 상세 패널 | GET | `/items/{itemId}` | 선택 품목 상세 보완 |

## 오류 처리

`ApiClient`가 다음 오류를 공통 형식으로 변환한다.

- HTTP 오류: 서버의 `error.code`, `error.message` 유지
- JSON이 아닌 오류: `HTTP_ERROR`
- 네트워크 연결 실패: `NETWORK_ERROR`
- 10초 초과: `REQUEST_TIMEOUT`

현재 화면은 오류 여부만 표시한다. 운영 단계에서는 오류 코드별 안내와 재시도 정책을 별도 설계한다.

## 확정과 가정

확정:

- 검색 결과는 품목당 한 행이다.
- 품목은 여러 사업·기종·계통·정비 계단·담당자를 가질 수 있다.
- 납품 상태의 의미는 예정·진행·완료다.
- 납지 식별자는 `Delivery_Destination.delivery_dest_id`에 대응하는 정수다.

가정:

- REST와 `/api/v1` 경로
- 영문 전송 상태 코드
- 1-base 페이지
- 요청 제한시간 10초

미확정:

- 인증·권한 Header
- 운영 API Host와 CORS 정책
- 품목 상태의 최종 코드·전이
- 관리 품목 유형 저장 위치
- 백엔드 기술과 MS Access 연결 방식

## 백엔드 연결 전 체크리스트

- OpenAPI의 네 Endpoint가 구현됐는가
- 목록 응답이 품목당 한 행인가
- 복수 관계가 중복 없이 배열로 집계되는가
- 담당자 `role`과 정·부 구분이 NULL이어도 응답 가능한가
- `delivery_month`, `receipt_month`를 `YYYY-MM-DD`로 직렬화하는가
- 실제 데이터가 없을 때 빈 배열과 선택 필드를 계약대로 반환하는가
- 검색·정렬·페이징이 서버에서 처리되는가
- 오류 응답이 `ApiErrorResponse` 형식인가
