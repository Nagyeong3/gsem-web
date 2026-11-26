# 프로토타입 V7 릴리즈

## 목적

V7은 V6의 전체 업무 시나리오와 화면 품질을 유지하면서 Node 기반 임시 백엔드를 FastAPI로 전환하고, 실제 DB 연결 직전의 검색·Repository 경계와 프로젝트 인수인계 기준을 고정한다.

## 포함 기능

- 대시보드, 장비 검색, 장비 통합 상세
- 납품 일정 관리
- 변경 신청 및 처리 현황
- 최소 5단계 장비 단종·대체 계보
- 라이트·다크 모드
- 네 가지 Mock 역할과 전체 업무 이동 흐름
- 로딩·오류·빈 결과·재시도와 오래된 응답 보호
- FastAPI Router–Service–Repository 구조
- JSON 인메모리 목업 데이터 HTTP 응답
- Mock/API 모드 전환
- 요청 검증, 요청 ID, 공통 오류와 개발 CORS
- Repository 검색 조건·정렬·페이징 계약
- 20,000건 일반화 목업 검색 회귀검사

## 제외 범위

- 실제 MS Access 연결
- 실제 로그인·SSO와 운영 권한
- 실제 승인·반려 및 쓰기 트랜잭션
- 사내 메일과 단종 문의 자동발송
- 실제 자료 Import와 운영 배포

## 검증 결과

- TypeScript: 통과
- ESLint: 경고 0건
- Ruff: 통과
- Pytest: 14건 통과
- OpenAPI 계약: 3건 통과
- 프론트 단위·FastAPI 통합: 33건 통과
- 프로덕션 빌드: 통과
- Mock E2E: 12건 통과
- FastAPI E2E: 2건 통과
- 기존 기준 시안과 화면 프레임 변경 없음

## 실행

```bash
npm install
python -m venv .venv

# Windows
.venv\Scripts\python -m pip install -r requirements-dev.txt

# macOS/Linux
.venv/bin/python -m pip install -r requirements-dev.txt

npm run dev:api
```

브라우저는 `http://localhost:5173`, FastAPI 상태 확인은 `http://127.0.0.1:4010/health`를 사용한다.

## 다음 단계

최종 ERD와 익명 데이터가 확보되면 읽기 전용 `MsAccessGsemRepository`를 구현하고 인메모리 Repository와 동일한 계약 테스트를 실행한다. 단종 점검과 메일 문안 기능은 현업 업무 흐름을 확인한 뒤 별도 릴리즈로 진행한다.
