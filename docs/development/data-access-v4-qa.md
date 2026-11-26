# 전체 화면 데이터 접근 계층 검수 결과

## 목적

DB와 운영 백엔드가 확정되기 전에 모든 프로토타입 화면이 Mock과 HTTP API를 같은 방식으로 사용할 수 있도록 데이터 접근 경계를 완성했다. 화면은 DB Entity나 API DTO를 직접 사용하지 않는다.

## 적용 범위

| 화면 | Service | Mock | HTTP | Mapper |
| --- | --- | --- | --- | --- |
| 메인 대시보드 | `DashboardService` | 적용 | 적용 | 적용 |
| 장비 검색·상세 | `EquipmentService` | 적용 | 적용 | 적용 |
| 납품 일정 | `DeliveryScheduleService` | 적용 | 적용 | 적용 |
| 변경 신청 | `ChangeRequestService` | 적용 | 적용 | 적용 |
| 장비 변경 이력 | `ReplacementHistoryService` | 적용 | 적용 | 적용 |

## 주요 결정

- `VITE_DATA_SOURCE=mock`이 기본이며 DB 없이 현재 프로토타입을 실행할 수 있다.
- `VITE_DATA_SOURCE=api`에서는 동일 Service 인터페이스가 HTTP Adapter로 교체된다.
- 표시명 기반 화면 필터는 `/items/filter-options` 응답의 코드·ID로 변환한 뒤 API에 전달한다.
- 납품 수량은 화면의 계획·발주·입고·납품 수량을 선택 필드로 분리했다. 실제 DB 매핑은 미확정이다.
- 변경 상태의 영문 코드는 프로토타입 계약이며 실제 처리 순서가 확정되면 교체한다.
- 대체 이력의 단계와 좌표는 API가 전달한 관계로 프론트에서 계산한다. DB에 화면 좌표를 저장하지 않는다.
- 대체 이력 API가 변경 상세를 제공하지 않으면 담당자와 일시는 `-`로 표시하며 임의 정보를 생성하지 않는다.

## 자동 검증

| 검사 | 결과 | 비고 |
| --- | --- | --- |
| TypeScript 검사 | 통과 | 전체 타입 경계 확인 |
| ESLint | 통과 | 경고 0건 |
| Vitest | 통과 | 12개 파일, 30개 테스트 |
| OpenAPI·Stub API 계약 테스트 | 통과 | 18개 테스트 |
| 프로덕션 빌드 | 통과 | Vite 빌드 완료 |
| Git 공백 오류 | 통과 | `git diff --check` |
| 로컬 Playwright | 환경 제약 | 설치된 Chromium이 실행 환경에서 SIGSEGV로 종료 |
| GitHub Actions 기본 Playwright | 통과 | 실행 #42, 1440×900 시나리오 10개 |
| GitHub Actions API Playwright | 통과 | 실행 #42, Stub HTTP 전체 조회 시나리오 1개 |

## 브라우저 검증 범위

GitHub Actions에서 다음 두 절차를 분리해 실행한다.

1. 기본 Mock 모드의 1440×900 전체 화면 회귀 검사 및 캡처
2. Stub API와 API 모드 프론트를 함께 실행한 전체 조회 흐름 검사

API 모드 검사는 대시보드, 장비 검색, 장비 상세, 납품 일정 필터, 변경 신청 필터, 5단계 대체 이력과 브라우저 콘솔 오류를 확인한다.

검수 중 브라우저 네이티브 `fetch`의 실행 문맥이 깨져 HTTP 요청이 시작되지 않는 문제를 발견했다. `globalThis`에 바인딩한 `fetch`를 사용하도록 수정했으며, Stub과 Vite의 생명주기를 하나의 API E2E 실행기로 통합했다. 수정 후 GitHub Actions 실행 #42에서 기본 Mock 모드와 API 모드가 모두 통과했다.

## 미확정 사항

- 운영 백엔드와 MS Access 연결 방식
- 인증·인가 Header와 역할별 접근 범위
- 납품 지연 판정과 계획·발주·입고·납품 수량의 원천 필드
- 변경 상태의 실제 코드와 처리 순서
- 대체 관계의 사업별 유효기간과 변경 상세 원천

## 보안 확인

- 실제 품번·사업·인사·계약·납품 자료를 추가하지 않았다.
- 실제 서버 주소, Token, API Key 및 `.env.local`을 추가하지 않았다.
- 공개 저장소용 일반화 목업 데이터만 사용했다.

## 최종 판정 기준

GitHub Actions의 Mock·HTTP 브라우저 검사가 모두 통과했으므로 데이터 접근 계층을 다음 개발 단계의 기준으로 사용할 수 있다.
