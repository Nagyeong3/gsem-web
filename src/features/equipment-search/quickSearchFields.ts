// 통합검색에서는 품번·품명·재고번호만 비교한다. 용도는 상세 조건에서 조회한다.
export const quickSearchFields = [
  ['itemNum', '품번'],
  ['kaiPartNumber', 'KAI 품번'],
  ['itemNameKor', '품명'],
  ['itemNameEng', '영문 품명'],
  ['itemNsn', '재고번호'],
] as const;

export function matchesQuickSearch(value: string | undefined, query: string) {
  return Boolean(query && value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
}
