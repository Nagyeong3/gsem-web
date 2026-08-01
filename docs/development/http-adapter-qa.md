# Mock·HTTP 전환 구조 검수 결과

## 검수 범위

- 대시보드 Service 전환
- 장비 검색·필터·정렬·페이징 Service 전환
- API DTO → 화면 View Model Mapper
- 공통 HTTP Client
- Mock·HTTP 환경변수 선택
- OpenAPI 납지 식별자 정합성

## 자동 검사

| 검사 | 결과 | 비고 |
|---|---|---|
| TypeScript Type Check | 통과 | `npm run typecheck` |
| ESLint | 통과 | Warning 0건 |
| Vitest | 통과 | 5개 파일, 11개 Test |
| Production Build | 통과 | Vite Build 완료 |
| OpenAPI YAML Parse | 통과 | OpenAPI 3.1.0 |
| OpenAPI 내부 참조 | 통과 | 참조 66개, Schema 22개 |
| Git 공백 오류 | 통과 | `git diff --check` |

## 동작 검수

| 항목 | 결과 | 확인 방법 |
|---|---|---|
| 기본 실행 모드 | 통과 | 환경변수 미설정 시 Mock 선택 |
| 대시보드 데이터 공급자 | 통과 | 페이지의 Mock 직접 참조 제거 |
| 검색 결과 품목당 한 행 | 통과 | Mock Service에서 기존 Filter 후 Page 처리 |
| 서버형 정렬·페이징 계약 | 통과 | Mock과 HTTP가 동일한 `search()` 사용 |
| 필터 표시명 → 코드·ID | 통과 | HTTP Adapter의 선택지 Cache 기준 변환 |
| 선택 품목 상세 조회 | 통과 | 행 선택 시 `/items/{itemId}` 조회 구조 |
| 담당자 Nullable | 통과 | 역할·정/부 누락 시 미지정 표시 |
| 공통 오류 변환 | 통과 | HTTP·Network·Timeout 오류 단위 Test |
| 원본 기준 시안 | 통과 | 이미지 파일 변경 없음 |

## 발견하고 수정한 문제

1. API 계약에서 검색 Parameter는 `destinationId` 정수였지만 납지 선택지는 일반 `Code`로 정의돼 있었다.
   - `Destination { destinationId, name }` Schema로 분리했다.
2. 목록 DTO에는 사업·기종·납지가 독립 배열이라 기존 상세 View Model을 그대로 만들 수 없었다.
   - 목록에서는 표시에 필요한 요약만 구성하고, 행 선택 시 상세 Endpoint로 보완하도록 분리했다.
3. 담당자 `role`과 정·부 값이 실제 DB에서 NULL일 수 있지만 화면 타입은 필수였다.
   - View Model과 표시 컴포넌트가 선택값을 안전하게 처리하도록 변경했다.
4. 페이지가 Mock Service 구현체를 직접 Import하고 있었다.
   - 런타임 설정에 따라 동일한 Service 인터페이스의 Mock 또는 HTTP 구현을 주입하도록 변경했다.

## 브라우저 E2E 제약

Playwright Test 실행을 시도했으나 현재 작업 환경에 Chromium 실행 파일이 없었다. 브라우저 설치도 실행 환경의 Network 승인 제한으로 완료하지 못했다. 따라서 이번 검수에서 E2E 통과를 주장하지 않는다.

기존 E2E Test 소스는 변경하지 않았으며, Chromium이 설치된 환경에서는 다음 명령으로 다시 확인한다.

```bash
npx playwright install chromium
npm run test:e2e
```

## 보안 확인

- 실제 회사 품번·사업명·직원정보 추가 없음
- 실제 서버 주소·Token·API Key 추가 없음
- `.env.local`은 Git 제외 대상
- `.env.example`은 Placeholder만 포함
- 촬영 이미지와 사내 원본 자료 추가 없음

## 최종 판정

코드 정적 검사, 단위 Test, Build와 API 계약 검수는 통과했다. 브라우저 E2E는 환경 제약으로 미실행 상태이며, 사용자 환경 또는 CI에 Chromium을 준비한 뒤 재검수해야 한다.
