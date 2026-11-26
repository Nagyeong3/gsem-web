type ReleaseEntry = {
  version: string;
  deployedOn?: string;
  changes: readonly { keyword: string; description: string }[];
  verification?: string;
};

// 반입 번들에 포함된 릴리스만 기록한다. 운영 반영일은 확인된 경우에만 추가한다.
const releases: readonly ReleaseEntry[] = [
  {
    version: 'v0.25.2',
    changes: [
      { keyword: '검색어 강조', description: '장비 통합검색은 품번, KAI 품번, 국문·영문 품명과 NSN을 조회합니다. 결과에서 일치한 글자를 강조하며, 원래 열을 숨긴 경우에도 일치 항목에서 확인할 수 있습니다. 용도는 상세 조건에서 검색할 수 있습니다.' },
      { keyword: 'KAI 품번·장비 상세', description: '검색 결과와 통합 상세에서 KAI 품번을 확인할 수 있습니다. 상세 화면에 SERD 규격 등 연결된 정보를 표시하고, 데이터 연결이 없는 항목에는 미연결을 표시합니다.' },
      { keyword: '사업·장비 표 정렬', description: '지원장비 통합현황에서 상위 사업 표와 차수별 하위 장비 표의 열 제목을 눌러 각각 오름차순과 내림차순으로 정렬할 수 있습니다.' },
      { keyword: '납품수량·납품일', description: '상위 표에서 납품수량과 최근 실납품일을 별도 열로 확인할 수 있습니다. 납품일이 비어 있는 셀에 마우스를 올리면 납품 처리 미리보기를 열 수 있습니다.' },
    ],
    verification: '사내 SQL Server 연결 검증 대기.',
  },
  {
    version: 'v0.25.1',
    changes: [
      { keyword: '상세 조건 펼치기', description: '장비 검색의 상세 조건이 기존 필터 아래에 펼쳐집니다. 조건을 적용한 뒤에도 펼쳐진 상태가 유지됩니다.' },
      { keyword: '내 필터 설정', description: '필터 표시 설정에서 기본·상세 필터를 고를 수 있습니다. 선택은 사용자 프로필별로 브라우저에 저장됩니다.' },
      { keyword: '숨긴 조건 확인', description: '숨긴 필터에 적용된 조건도 검색 조건 목록에서 확인하고 개별 해제할 수 있습니다.' },
      { keyword: '운영 버전 이력', description: '운영 화면의 버전 변경 이력에 이번 릴리스와 이전 버전의 변경사항을 표시합니다.' },
    ],
    verification: '프론트 빌드 및 테스트 통과. 사내 SQL Server 검증 대기.',
  },
  {
    version: 'v0.25.0',
    changes: [
      { keyword: '납품 부대 필터', description: '납품 일정에서 납품 부대를 사업 차수 앞에 배치했습니다.' },
      { keyword: '사이드바 버전 이력', description: '사이드바에서 버전별 변경 이력을 확인할 수 있습니다.' },
      { keyword: '상세 검색', description: '장비 검색에 품번·품명·용도·계통·정비계단·장비 구분·NSN으로 조회하는 상세 조건을 추가했습니다.' },
      { keyword: 'KAI 품번·SERD', description: '장비 상세 조건에서 KAI 품번과 SERD 번호를 검색할 수 있습니다.' },
      { keyword: '검색 후보', description: '장비 검색창과 상세 조건에 입력하는 동안 일치하는 검색 옵션을 표시합니다.' },
      { keyword: '내 컬럼 설정', description: '장비 검색 결과의 열을 표시·숨김·재정렬하고 사용자 프로필별로 보기를 저장합니다.' },
      { keyword: '품번 일괄 검색·엑셀', description: '여러 품번을 붙여넣어 일괄 검색하고 전체 검색 결과를 엑셀로 내려받습니다.' },
      { keyword: '재고번호', description: '장비 검색에 NSN을 추가하고 장비 상세에 재고번호를 표시합니다.' },
    ],
    verification: '개발 서버 반영 전',
  },
  {
    version: 'v0.24.4',
    changes: [
      { keyword: '품명·품번 다중선택', description: '통합현황에서 품명과 품번 조건을 여러 개 선택할 수 있습니다.' },
      { keyword: '달력 필터', description: '납품 일정의 사업 차수와 납품 부대 필터 표시를 개선했습니다.' },
    ],
    verification: '프론트 빌드 및 테스트 통과. 사내 실DB 검증 대기.',
  },
  {
    version: 'v0.24.3',
    changes: [{ keyword: '달력 선택·통합 검색', description: '납품 일정의 필터 선택과 달력 표시를 맞추고, 통합현황 검색에 입력 제안을 추가했습니다.' }],
  },
  {
    version: 'v0.24.2',
    changes: [{ keyword: '차수별 달력', description: '납품 일정의 차수별 달력 표시를 단순화하고 화면 스타일 호환성을 개선했습니다.' }],
  },
  {
    version: 'v0.24.1',
    changes: [{ keyword: '장비 상세 팝업', description: '장비 상세 팝업의 형식과 화면 컴포넌트 호환성을 보완했습니다.' }],
  },
  {
    version: 'v0.24.0',
    changes: [{ keyword: '납품 일정·집계', description: '납품 일정 화면과 이동 동작을 개선하고, 통합현황 집계에 검색 조건을 반영했습니다.' }],
  },
];

export function getReleaseEntries(channel: 'development' | 'production'): readonly ReleaseEntry[] {
  return channel === 'development' ? releases : releases.map(({ version, deployedOn, changes }) => ({
    version, deployedOn, changes,
  }));
}
