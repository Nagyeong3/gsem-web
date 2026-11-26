# GSEM v0.24.4 필터 개선 반입 안내

## 기준과 포함 범위

- 복구한 최신 저장본: `d915fcfe6d9f9f060ffb0cfae62e95c2ff9befee` (v0.24.3).
- 앞선 대화에서 설명한 이후 수정 코드는 보존본에서 찾을 수 없어 이 버전을 기준으로 다시 구현했다.
- 품명·품번: 입력 즉시 옵션 검색, 연속 다중선택, 추가 검색 중 선택 유지.
- 목록 선택은 정확일치, 직접 입력 후 Enter는 부분일치 조건을 추가한다.
- 같은 필터는 OR, 다른 필터는 AND이며 상위 종·점·PR·PO·입고·납품·금액 집계와 하위 품목에 동일한 조건을 적용한다.
- 기존 단일 문자열 검색 설정은 부분일치 조건으로 이전한다.
- 달력 차수명만 표시, 선택 사업·차수에 따른 납품부대 옵션, 가용 공간을 측정한 칩 표시와 +N, 일정 카드와 같은 배경색.
- 사업·부대·상태처럼 여러 일정과 연결된 칩은 첫 연결 일정의 색을 사용한다.
- 기존 v0.24.0~v0.24.3 변경과 MUI 9 호환성 수정도 포함한다.
- 다른 페이지의 다중선택 확대는 이번 반입 범위에 포함하지 않는다.

## 적용 (Windows PowerShell)

기존 GSEM 저장소 폴더에서 실행한다. 작업 중인 변경은 먼저 커밋하거나 보관한다.

```powershell
git status --short
git bundle verify .\GSEM-v0.24.4-filter-update.bundle
git fetch .\GSEM-v0.24.4-filter-update.bundle refs/heads/release/v0.24.4
git merge --ff-only FETCH_HEAD
npm run build
```

FastAPI 백엔드도 같은 소스로 갱신하고 재시작한다. 프론트만 교체하면 신규 복수 조건 파라미터가 서버에 적용되지 않는다.
기존 의존성 변경은 없다. 신규 PC에서는 잠금 파일에 맞춰 의존성을 설치해야 한다.
번들은 전체 이력을 포함하므로 특정 이전 커밋을 필수로 요구하지 않는다. 빌드 산출물, node_modules, Python 가상환경, 실DB, 환경 설정은 포함하지 않는다.

`--ff-only`가 거부되면 기존 브랜치와 이력이 갈라진 상태다. 강제 초기화하지 말고 분기 상태를 확인한다. 별도 검토 브랜치로 확인하려면 아래를 실행한다.

```powershell
git switch -c review/gsem-v0.24.4 FETCH_HEAD
```

새 저장소 복원은 다음과 같다.

```powershell
git clone -b release/v0.24.4 .\GSEM-v0.24.4-filter-update.bundle GSEM-v0.24.4
```

## 검증

- 정식 TypeScript 검사 및 전체 프론트 프로덕션 빌드 통과.
- MUI 호환성 검사 통과 (`--fix` 미사용).
- 백엔드 Pytest 42개 통과: 생성 SQL을 SQLite 시연 테이블에서 실행해 OR/AND, 정확·부분일치, 동일 행 조건, 집계·와일드카드 처리와 제한을 검증했다. 실제 SQL Server 연결 검증은 수행하지 않았다.
- 프론트 Vitest 전체 56개 통과 (추가 입력 컴포넌트 2개 포함).
- API 계약 검사 3개 통과.
- 수정한 프론트 파일의 ESLint와 수정한 백엔드 파일의 Ruff 통과.
- 전체 ESLint: 기존 ScheduleChangeDialog.tsx의 동기 setState effect 오류가 남아 있다.
- 전체 Ruff: 변경하지 않은 delivery_calendar.py, equipment_search.py, main.py, test_equipment_search.py의 기존 8개 오류가 남아 있다.
- Playwright E2E 3개는 Chromium이 socket 권한 제한으로 시작되지 않아 실행이 차단됐다. 브라우저 화면 검증 완료로 취급하지 않는다.
- 최종 Git bundle은 별도 빈 저장소 복원 및 Git 무결성 검사를 수행한다.
