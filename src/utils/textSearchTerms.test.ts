import { describe, expect, it } from 'vitest';
import { appendTextSearchParams, matchesTextSearch, migrateTextSearchTerms, normalizeTextSearchTerms } from './textSearchTerms';

describe('복수 품명·품번 검색 조건', () => {
  it('정확일치는 접미 품목을 제외하며 같은 필터의 부분일치와 OR로 결합한다', () => {
    const terms = [{ value: 'A-001', match: 'exact' as const }, { value: 'B-', match: 'contains' as const }];
    expect(matchesTextSearch('A-001', terms)).toBe(true);
    expect(matchesTextSearch(' A-001 ', terms)).toBe(true);
    expect(matchesTextSearch('A-001-EXTRA', terms)).toBe(false);
    expect(matchesTextSearch('b-007', terms)).toBe(true);
    expect(matchesTextSearch(null, terms)).toBe(false);
    expect(matchesTextSearch(null, [])).toBe(true);
  });
  it('정확·부분일치 방식별 파라미터를 구분하며 기존 문자열 조건을 보존한다', () => {
    const terms = normalizeTextSearchTerms([
      { value: ' A-001 ', match: 'exact' }, { value: 'a-001', match: 'exact' },
      { value: 'A-001', match: 'contains' }, { value: ' ', match: 'contains' },
    ]);
    expect(terms).toHaveLength(2);
    const params = new URLSearchParams();
    appendTextSearchParams(params, 'itemNumbers', 'itemNumberTerms', terms);
    expect(params.getAll('itemNumbers')).toEqual(['a-001']);
    expect(params.getAll('itemNumberTerms')).toEqual(['A-001']);
    expect(migrateTextSearchTerms(' 유압 ')).toEqual([{ value: '유압', match: 'contains' }]);
    expect(migrateTextSearchTerms({ invalid: true })).toEqual([]);
  });
});
