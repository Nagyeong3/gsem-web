import { describe, expect, it } from 'vitest';
import { calendarVisibleCount, replaceSelectionInScope, roundDestinationOptions, roundFilterView, selectedOptions, selectionFromValues } from './roundSelection';

const month = [
  { subContractId: 1, destination: '가 부대', deliveryCompleted: true },
  { subContractId: 2, destination: '나 부대', deliveryCompleted: false },
  { subContractId: 3, destination: null, deliveryCompleted: false },
];
const defaults = { rounds: null, destinations: null, statuses: null };
describe('차수 달력 필터 선택과 표시 일치', () => {
  it('현재 사업의 일정 중 선택한 차수에 속한 납품 부대만 제공한다', () => {
    expect(roundDestinationOptions(month, [2])).toEqual(['나 부대']);
    expect(roundDestinationOptions(month, [3])).toEqual(['부대 미지정']);
    expect(roundDestinationOptions(month, [])).toEqual([]);
    expect(roundDestinationOptions(month, null)).toHaveLength(3);
  });
  it('기본 전체 선택과 명시적인 선택 없음이 다르다', () => {
    expect(selectedOptions(null, [1,2])).toEqual([1,2]);
    expect(selectedOptions([], [1,2])).toEqual([]);
    expect(selectionFromValues([1,2], [1,2])).toBeNull();
    expect(selectionFromValues([], [1,2])).toEqual([]);
    expect(roundFilterView(month, defaults, false).visibleRoundIds).toEqual([1,2,3]);
    expect(roundFilterView(month, { ...defaults, rounds: [] }, false).events).toEqual([]);
  });
  it('다른 필터와 완료 숨김을 적용하면 현재 보이는 차수만 선택으로 표시한다', () => {
    const view = roundFilterView(month, { ...defaults, destinations: ['나 부대','부대 미지정'] }, true);
    expect(view.visibleRoundIds).toEqual([2,3]);
    expect(view.events.map(event => event.subContractId)).toEqual(view.visibleRoundIds);
    expect(view.roundIds).toEqual([1,2,3]);
  });
  it('다른 필터에 가려진 선택을 보존한다', () => {
    expect(replaceSelectionInScope(null, new Set([2,3]), [3], [1,2,3])).toEqual([1,3]);
    expect(replaceSelectionInScope([1,3], new Set([2,3]), [2,3], [1,2,3])).toBeNull();
    expect(replaceSelectionInScope([9,2], new Set([2,3]), [3], [1,2,3])).toEqual([9,3]);
  });
  it('좁은 화면에서도 더보기 영역을 예약하고 한 건은 충분한 공간에 표시한다', () => {
    expect(calendarVisibleCount(420, 6, 1)).toBe(1);
    expect(calendarVisibleCount(420, 6, 8)).toBe(0);
    expect(calendarVisibleCount(600, 5, 8)).toBe(2);
    expect(calendarVisibleCount(900, 5, 8)).toBe(4);
    expect(calendarVisibleCount(600, 5, 1)).toBe(1);
  });
});
