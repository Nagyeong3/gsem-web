import { describe, expect, it } from 'vitest';
import { matchingSearchOptions } from './searchOptions';

describe('filter option search', () => {
  it('narrows Korean item names as input changes and preserves case-insensitive part number search', () => {
    const names = ['유압 시험장비', '유압 호스', '전원 시험장비'];
    expect(matchingSearchOptions(names, '유압')).toEqual(names.slice(0, 2));
    expect(matchingSearchOptions(names, ' 유압 시 ')).toEqual([names[0]]);
    expect(matchingSearchOptions(['DEMO-001', 'DEMO-002'], 'demo-002')).toEqual(['DEMO-002']);
    expect(matchingSearchOptions(names, '없는 품목')).toEqual([]);
  });
  it('limits rendering without limiting search to the first options', () => {
    const options = Array.from({ length: 200 }, (_, index) => `품목 ${index}`);
    expect(matchingSearchOptions(options, '')).toHaveLength(100);
    expect(matchingSearchOptions(options, '199')).toEqual(['품목 199']);
  });
});
