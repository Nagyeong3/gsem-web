import type { Equipment } from '../../types/domain';

export const unavailable = '미연결';
export function displayDetail(value?: number | string | null): string {
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('ko-KR') : unavailable;
  return value?.trim() && value.trim() !== '-' ? value.trim() : unavailable;
}

export function detailGroups(equipment: Equipment) {
  const { serd, calibration, replacementSummary } = equipment;
  const measure = (value: number | null | undefined, unit: string) =>
    value != null && Number.isFinite(value) ? `${displayDetail(value)} ${unit}` : unavailable;
  const dimensions = [serd?.lengthCm, serd?.widthCm, serd?.heightCm];
  const size = dimensions.every(value => value != null && Number.isFinite(value))
    ? `${dimensions.map(displayDetail).join(' × ')} cm` : unavailable;
  return [
    { title: 'SERD 정보', rows: [
      ['SERD 번호', displayDetail(serd?.serdNumber)], ['크기', serd?.size?.trim() || size],
      ['길이', measure(serd?.lengthCm, 'cm')], ['너비', measure(serd?.widthCm, 'cm')], ['높이', measure(serd?.heightCm, 'cm')],
      ['중량', serd?.weightKg == null ? displayDetail(serd?.weight) : measure(serd.weightKg, 'kg')],
      ['주용도', displayDetail(serd?.primaryUsage)],
    ] },
    { title: '품보·교정 정보', rows: [
      ['품보 형태', displayDetail(equipment.qualityAssuranceType?.name)],
      ['교정 대상', calibration ? (calibration.required ? '대상' : '비대상') : unavailable],
      ['교정 주기', measure(calibration?.cycleMonths, '개월')],
      ['교정 방식', displayDetail(calibration?.method)], ['교정 기관', displayDetail(calibration?.provider)],
    ] },
    { title: '획득·수명 정보', rows: [
      ['획득구분', unavailable], ['국내/해외', unavailable], ['조달시간 (LT)', unavailable], ['단종 여부', unavailable],
      ['최근 변경', displayDetail(equipment.recentChangeDate)],
      ['이전 품목', replacementSummary ? `${replacementSummary.predecessors}개` : unavailable],
      ['대체 품목', replacementSummary ? `${replacementSummary.successors}개` : unavailable],
    ] },
  ];
}
