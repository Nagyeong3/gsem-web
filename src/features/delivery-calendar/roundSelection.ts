// null은 전체(새 옵션 포함), []는 명시적으로 아무 것도 선택하지 않은 상태다.
export type Selection<T> = T[] | null;
export type RoundFilters = { rounds: Selection<number>; destinations: Selection<string>; statuses: Selection<string> };
export function selectedOptions<T>(selection: Selection<T>, options: T[]): T[] {
  return selection === null ? options : options.filter(option => selection.includes(option));
}
export function selectionFromValues<T>(values: T[], options: T[]): Selection<T> {
  return options.length > 0 && options.every(option => values.includes(option)) ? null : values;
}
export function includesSelection<T>(selection: Selection<T>, value: T): boolean {
  return selection === null || selection.includes(value);
}
export function roundDestinationOptions<T extends { subContractId: number; destination: string | null }>(
  events: T[], rounds: Selection<number>,
): string[] {
  return [...new Set(events.filter(event => includesSelection(rounds, event.subContractId))
    .map(event => event.destination?.trim() || '부대 미지정'))].sort((a, b) => a.localeCompare(b, 'ko'));
}
// 다른 필터 또는 다른 월에 가려진 기존 선택을 변경하지 않는다.
export function replaceSelectionInScope<T>(selection: Selection<T>, scope: ReadonlySet<T>, values: T[], options: T[]): Selection<T> {
  const hidden = (selection ?? options).filter(option => !scope.has(option));
  return selectionFromValues([...new Set([...hidden, ...values])], options);
}
export function roundFilterView<T extends { subContractId: number; destination: string | null; deliveryCompleted: boolean }>(monthEvents: T[], filters: RoundFilters, hideComplete: boolean) {
  const eligible = monthEvents.filter(event =>
    (!hideComplete || !event.deliveryCompleted) &&
    includesSelection(filters.statuses, event.deliveryCompleted ? '완료' : '미완료') &&
    includesSelection(filters.destinations, event.destination?.trim() || '부대 미지정'));
  const roundIds = [...new Set(monthEvents.map(event => event.subContractId))];
  const availableRoundIds = new Set(eligible.map(event => event.subContractId));
  const events = eligible.filter(event => includesSelection(filters.rounds, event.subContractId));
  const visibleRoundIds = [...new Set(events.map(event => event.subContractId))];
  return { events, roundIds, availableRoundIds, visibleRoundIds };
}
// 날짜 번호와 여백 38px, 일정 카드 28px, 더보기 26px를 보수적으로 예약한다.
export function calendarVisibleCount(gridHeight: number, weeks: number, total: number): number {
  const room = Math.max(0, Math.floor(gridHeight / Math.max(1, weeks)) - 38);
  const allFit = Math.min(5, Math.floor(room / 28));
  return total <= allFit ? total : Math.max(0, Math.min(5, Math.floor((room - 26) / 28)));
}
