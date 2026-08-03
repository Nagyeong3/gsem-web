import {
  ArrowBack,
  AssignmentOutlined,
  BusinessOutlined,
  CalendarMonthOutlined,
  History,
  HubOutlined,
  Inventory2Outlined,
  PersonOutlined,
  PrecisionManufacturingOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { QueryStatePanel } from '../components/common/QueryStatePanel';
import { SectionCard } from '../components/common/SectionCard';
import { StatusChip } from '../components/common/StatusChip';
import { equipmentService } from '../services';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import type { Equipment } from '../types/domain';

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 2, py: 0.8 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 13, fontWeight: 500, minWidth: 0 }}>
        {children}
      </Typography>
    </Box>
  );
}

function LabelList({ values }: { values: string[] }) {
  if (values.length === 0) return <>-</>;
  return (
    <Stack sx={{ flexDirection: 'row', gap: 0.75, flexWrap: 'wrap' }}>
      {values.map((value) => (
        <Chip key={value} label={value} variant="outlined" size="small" />
      ))}
    </Stack>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(108,168,255,0.12)' : '#EEF5FF',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>{label}</Typography>
        <Typography sx={{ mt: 0.15, fontSize: 13, fontWeight: 700 }} noWrap>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export function EquipmentDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const parsedId = Number(itemId);
  const hasValidId = Number.isInteger(parsedId) && parsedId > 0;
  const loadEquipment = useCallback(() => equipmentService.getById(parsedId), [parsedId]);
  const { data: equipment, isLoading, isError, refetch } = useAsyncQuery<Equipment | undefined>({
    queryFn: loadEquipment,
    enabled: hasValidId,
  });

  if (isLoading) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 58px)', display: 'grid', placeItems: 'center' }}>
        <QueryStatePanel state="loading" loadingMessage="상세 정보를 불러오고 있습니다." minHeight={360} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 58px)', display: 'grid', placeItems: 'center' }}>
        <QueryStatePanel state="error" errorMessage="장비 상세 정보를 불러오지 못했습니다." onRetry={refetch} minHeight={360} />
      </Box>
    );
  }

  if (!hasValidId || !equipment) {
    return (
      <Box sx={{ minHeight: 'calc(100vh - 58px)', display: 'grid', placeItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <QueryStatePanel state="empty" emptyMessage="장비 정보를 찾을 수 없습니다." minHeight={220} />
          <Button variant="outlined" onClick={() => navigate('/equipment')}>장비 검색으로 돌아가기</Button>
        </Box>
      </Box>
    );
  }

  const businesses = [...new Set(equipment.applications.map((item) => item.business))];
  const aircraftTypes = [...new Set(equipment.applications.map((item) => item.aircraftType))];
  const deliveries = equipment.applications.flatMap((item) => item.deliveries);
  const destinations = [...new Set(deliveries.map((item) => item.destination))];
  const primaryManager = equipment.managers.find((manager) => manager.assignmentType === '정');

  return (
    <Box sx={{ p: 3, minWidth: 1040, bgcolor: 'background.default' }}>
      <PageHeader
        title="장비 통합 상세"
        description="품목의 기본정보와 사업·담당자·납품 연계정보를 한 화면에서 확인합니다."
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/equipment')}>
            장비 검색
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
              <StatusChip status={equipment.status} />
              <Chip label={equipment.itemType ?? '품목 유형 미확정'} size="small" variant="outlined" />
            </Stack>
            <Typography sx={{ mt: 1.1, fontSize: 22, fontWeight: 700 }}>{equipment.itemNameKor}</Typography>
            <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 13 }}>{equipment.itemNum}</Typography>
          </Box>
          <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'flex-start' }}>
            <Button variant="outlined" startIcon={<CalendarMonthOutlined />} onClick={() => navigate(`/deliveries?itemId=${equipment.itemId}`)}>납품 일정</Button>
            <Button variant="outlined" startIcon={<History />} onClick={() => navigate(`/history?itemId=${equipment.itemId}`)}>변경 이력</Button>
            <Button variant="outlined" startIcon={<AssignmentOutlined />} onClick={() => navigate(`/requests?itemId=${equipment.itemId}`)}>변경 신청 내역</Button>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
          <SummaryItem icon={<BusinessOutlined fontSize="small" />} label="적용 사업" value={`${businesses.length}개`} />
          <SummaryItem icon={<PrecisionManufacturingOutlined fontSize="small" />} label="장비 구분" value={equipment.category.name} />
          <SummaryItem icon={<PersonOutlined fontSize="small" />} label="주 담당자" value={primaryManager?.name ?? equipment.managers[0]?.name ?? '-'} />
          <SummaryItem icon={<CalendarMonthOutlined fontSize="small" />} label="최근 변경일" value={equipment.recentChangeDate} />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 0.75fr)', gap: 2 }}>
        <Stack spacing={2}>
          <SectionCard title="기본정보">
            <Box sx={{ px: 2, py: 1.1, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3 }}>
              <Box>
                <InfoRow label="품번">{equipment.itemNum}</InfoRow>
                <InfoRow label="국문 품명">{equipment.itemNameKor}</InfoRow>
                <InfoRow label="영문 품명">{equipment.itemNameEng || '-'}</InfoRow>
                <InfoRow label="국문 용도">{equipment.itemUsageKor || '-'}</InfoRow>
              </Box>
              <Box>
                <InfoRow label="품목 유형">{equipment.itemType ?? '미확정'}</InfoRow>
                <InfoRow label="장비 구분">{equipment.category.name}</InfoRow>
                <InfoRow label="제조사">{equipment.manufacturer}</InfoRow>
                <InfoRow label="사용 상태"><StatusChip status={equipment.status} /></InfoRow>
              </Box>
            </Box>
          </SectionCard>

          <SectionCard title="적용 정보">
            <Box sx={{ px: 2, py: 1.2 }}>
              <InfoRow label="기종"><LabelList values={aircraftTypes} /></InfoRow>
              <InfoRow label="사업"><LabelList values={businesses} /></InfoRow>
              <InfoRow label="계통"><LabelList values={equipment.systems.map((item) => item.name)} /></InfoRow>
              <InfoRow label="정비 계단"><LabelList values={equipment.maintenanceLevels.map((item) => item.name)} /></InfoRow>
            </Box>
          </SectionCard>

          <SectionCard title="사업별 연계정보">
            <Box sx={{ px: 2, py: 1.25 }}>
              {equipment.applications.map((application, index) => (
                <Box key={application.integratedId}>
                  {index > 0 && <Divider sx={{ my: 1.2 }} />}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 2 }}>
                    <InfoRow label="사업">{application.business}</InfoRow>
                    <InfoRow label="기종">{application.aircraftType}</InfoRow>
                    <InfoRow label="납지">{application.deliveries.map((item) => item.destination).join(' · ') || '-'}</InfoRow>
                  </Box>
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Stack>

        <Stack spacing={2}>
          <SectionCard title="담당자">
            <Box sx={{ px: 2, py: 1.25 }}>
              {equipment.managers.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>배정된 담당자가 없습니다.</Typography>
              ) : equipment.managers.map((manager, index) => (
                <Box key={`${manager.id}-${manager.role}-${index}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75 }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{manager.name}</Typography>
                    <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 11 }}>{manager.role ?? '역할 미지정'}</Typography>
                  </Box>
                  <Chip label={manager.assignmentType ?? '구분 미정'} size="small" variant="outlined" color={manager.assignmentType === '정' ? 'primary' : 'default'} />
                </Box>
              ))}
            </Box>
          </SectionCard>

          <SectionCard title="SERD 정보">
            <Box sx={{ px: 2, py: 1.1 }}>
              <InfoRow label="SERD No.">{equipment.serd?.serdNumber ?? '-'}</InfoRow>
              <InfoRow label="크기">{equipment.serd?.size ?? '-'}</InfoRow>
              <InfoRow label="중량">{equipment.serd?.weight ?? '-'}</InfoRow>
              <InfoRow label="주용도">{equipment.serd?.primaryUsage ?? '-'}</InfoRow>
            </Box>
          </SectionCard>

          <SectionCard title="품보·교정 정보">
            <Box sx={{ px: 2, py: 1.1 }}>
              <InfoRow label="품보 형태">{equipment.qualityAssuranceType?.name ?? '-'}</InfoRow>
              <InfoRow label="교정 대상">{equipment.calibration ? (equipment.calibration.required ? '대상' : '비대상') : '미확정'}</InfoRow>
              <InfoRow label="교정 주기">{equipment.calibration?.cycleMonths ? `${equipment.calibration.cycleMonths}개월` : '-'}</InfoRow>
              <InfoRow label="교정 방식">{equipment.calibration?.method ?? '-'}</InfoRow>
            </Box>
          </SectionCard>

          <SectionCard title="납품·대체 관계 요약">
            <Box sx={{ px: 2, py: 1.1 }}>
              <InfoRow label="주요 납지"><LabelList values={destinations} /></InfoRow>
              <InfoRow label="납품 일정">{deliveries.length}건</InfoRow>
              <InfoRow label="이전 품목">{equipment.replacementSummary ? `${equipment.replacementSummary.predecessors}개` : '-'}</InfoRow>
              <InfoRow label="대체 품목">{equipment.replacementSummary ? `${equipment.replacementSummary.successors}개` : '-'}</InfoRow>
              {equipment.replacementSummary?.hasBranch && (
                <Box sx={{ mt: 0.8, p: 1.1, display: 'flex', gap: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <HubOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>복수 대체 관계가 있는 품목입니다.</Typography>
                </Box>
              )}
            </Box>
          </SectionCard>
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ mt: 2, px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Inventory2Outlined sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
          품목 유형, SERD, 품보·교정 항목은 현재 확인된 데이터만 표시하며 미확정 값은 임의로 보정하지 않습니다.
        </Typography>
      </Paper>
    </Box>
  );
}
