# 프로토타입 V6 DB 연결 직전 통합 준비본

## 목적

V6은 실제 MS Access를 연결하지 않은 상태에서 프론트와 백엔드의 실행 경계, API 계약, 저장소 교체 지점을 검증하는 릴리즈다. 업무 상태값과 운영 권한은 여전히 프로토타입 가정이다.

## 실행 구조

```text
React 화면
→ Mock Service 또는 HTTP Service
→ OpenAPI DTO
→ FastAPI Router
→ GsemService
→ InMemoryGsemRepository

향후 교체 지점
→ MsAccessGsemRepository
```

V6 최초 구현은 Node 기본 모듈을 사용했으나 후속 작업에서 사용자의 유지보수 환경에 맞춰 FastAPI로 전환했다. 프론트 계약과 Repository–Service 경계는 유지되어 화면 코드를 변경하지 않는다.

## 폴더 책임

- `src/`: 프론트 화면, View Model, Mock·HTTP 데이터 접근
- `backend/app/services/`: HTTP나 DB를 모르는 업무 조회 서비스
- `backend/app/repositories/`: 인메모리 저장소와 향후 Access 어댑터 경계
- `backend/app/api/`: FastAPI Router와 조회 파라미터 검증
- `backend/app/main.py`: 미들웨어·CORS·공통 오류·실행 진입점
- `backend/tests/`: Repository와 HTTP 계약 자동검증
- `docs/api/openapi.yaml`: 프론트와 백엔드의 계약 기준

## 제공 기능

- 대시보드, 품목 목록·상세·필터, 납품 일정, 변경 이력, 대체 그래프 조회
- 검색·필터·정렬·1부터 시작하는 페이징
- 잘못된 입력과 존재하지 않는 품목의 공통 오류
- 성공 응답 `meta.requestId`, 오류 응답 `error.traceId`, `X-Request-ID` 헤더
- 허용된 로컬 Origin만 사용하는 개발 CORS
- Mock/API 모드 전환
- Repository–Service 분리와 MS Access 어댑터 자리

## 실행

첫 번째 터미널:

```bash
npm run server:dev
```

두 번째 터미널:

```bash
npm run dev:api
```

환경값은 `.env.example`을 기준으로 하며 비밀정보를 저장하지 않는다.

## 프로토타입 가정

- 인메모리 데이터는 재시작 시 초기화된다.
- 납품 상태는 `예정`, `진행`, `완료`의 화면 검증용 값이다.
- 변경 신청 상태와 처리 순서는 운영 승인 규칙이 아니다.
- 품목 담당자는 품목 기준으로 해석하되 현재 ERD에서는 사업 연계정보별 중복 행이 생길 수 있다.
- 관리 품목 유형의 실제 DB 저장 위치는 미확정이다.
- MS Access 드라이버, 동시성, 트랜잭션, 파일 잠금 정책은 구현하지 않았다.

## V6 검수 기준

- TypeScript, ESLint 경고 0건, 프론트 단위 테스트
- OpenAPI 경로와 실제 Endpoint 일치 계약 테스트
- Repository·Service 단위 테스트와 HTTP 통합 테스트
- 프로덕션 빌드, Mock/HTTP E2E
- 1440×900 라이트·다크 여섯 화면
- 콘솔 오류, 가로·세로 넘침, 한글 깨짐, 금지 데이터 검사
- 대시보드 `12 = 3 + 5 + 4`

## 최종 검수 결과

- TypeScript 검사와 ESLint 경고 0건: 통과
- 프론트 단위·통합 테스트: 13개 파일, 33개 통과
- OpenAPI·FastAPI 계약 테스트: 전환 브랜치의 자동검증 결과를 기준으로 한다.
- Repository·Service 테스트: 3개 통과
- 프로덕션 빌드: 통과
- Mock 모드 E2E: 12개 통과
- HTTP API 모드 E2E: 2개 통과
- 1440×900 라이트·다크 기본 화면 12장과 동작·예외 상태 19장: 해상도와 공통 프레임 통과
- 가로 넘침과 브라우저 콘솔 오류: 없음
- 상세 페이지의 세로 스크롤은 정보 열람을 위한 정상 동작이며 요소 잘림으로 판정하지 않음
- 한글 깨짐, 금지 직급·메뉴·실데이터: 발견되지 않음
- 대시보드 수치 `12 = 3 + 5 + 4`: 통과

후속 전체 감사의 발견 사항과 보완 내용은 `prototype-v6-quality-audit.md`를 기준으로 한다.
