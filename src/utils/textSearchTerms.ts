export type TextSearchTerm = { value: string; match: 'exact' | 'contains' };

export function isTextSearchTerms(value: unknown): value is TextSearchTerm[] {
  return Array.isArray(value) && value.every(term => term && typeof term.value === 'string'
    && term.value.trim().length > 0 && (term.match === 'exact' || term.match === 'contains'));
}

export function normalizeTextSearchTerms(terms: TextSearchTerm[]): TextSearchTerm[] {
  const unique = new Map<string, TextSearchTerm>();
  for (const term of terms) {
    const value = term.value.trim();
    if (value) unique.set(`${term.match}:${value.toLocaleLowerCase()}`, { ...term, value });
  }
  return [...unique.values()];
}

export function matchesTextSearch(value: string | null, terms: TextSearchTerm[]): boolean {
  const text = (value ?? '').trim().toLocaleLowerCase();
  return terms.length === 0 || terms.some(term => term.match === 'exact'
    ? text === term.value.trim().toLocaleLowerCase()
    : text.includes(term.value.trim().toLocaleLowerCase()));
}

export function appendTextSearchParams(params: URLSearchParams, exactKey: string, containsKey: string, terms: TextSearchTerm[]) {
  terms.forEach(term => params.append(term.match === 'exact' ? exactKey : containsKey, term.value));
}

/** 이전 단일 문자열 검색은 부분일치 조건으로 보존한다. */
export function migrateTextSearchTerms(value: unknown): TextSearchTerm[] {
  if (isTextSearchTerms(value)) return normalizeTextSearchTerms(value);
  return typeof value === 'string' && value.trim() ? [{ value: value.trim(), match: 'contains' }] : [];
}
