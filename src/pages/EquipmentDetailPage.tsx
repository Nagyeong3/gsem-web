import {
  ArrowBack,
  BusinessOutlined,
  CalendarMonthOutlined,
  History,
  HubOutlined,
  Inventory2Outlined,
  PersonOutlined,
  PrecisionManufacturingOutlined,
} from '@mui/icons-material';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
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
import { detailGroups, displayDetail, unavailable } from '../features/equipment-search/detailFields';
import type { Equipment } from '../types/domain';

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 2, py: 0.8 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 13, fontWeight: 500, minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

function LabelList({ values }: { values: string[] }) {
  const connected = values.filter(value => displayDetail(value) !== unavailable);
  if (connected.length === 0) return <>{unavailable}</>;
  return (
    <Stack sx={{ flexDirection: 'row', gap: 0.75, flexWrap: 'wrap' }}>
      {connected.map((value) => (
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

export type EmbeddedEquipmentDetailProps = { itemId: number };

// 라우트와 모달의 진입점을 분리하고 동일한 조회·표시 컴포넌트를 사용한다.
export function EquipmentDetailPage() {
  const { itemId } = useParams();
  return <EquipmentDetailContent itemId={Number(itemId)} embedded={false} />;
}

export function EmbeddedEquipmentDetail({ itemId }: EmbeddedEquipmentDetailProps) {
  return <EquipmentDetailContent itemId={itemId} embedded />;
}

function EquipmentDetailContent({ itemId: parsedId, embedded }: EmbeddedEquipmentDetailProps & { embedded: boolean }) {
  const navigate = useNavigate();
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
          {!embedded && <Button variant="outlined" onClick={() => navigate('/equipment')}>장비 검색으로 돌아가기</Button>}
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
    <Box sx={{ p: { xs: 1.5, md: 3 }, minWidth: 0, bgcolor: 'background.default' }}>
      {!embedded && <PageHeader
        title="장비 통합 상세"
        description="품목의 기본정보와 사업·담당자·납품 연계정보를 한 화면에서 확인합니다."
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/equipment')}>
            장비 검색
          </Button>
        }
      />}

      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            {!equipment.databaseDetails && <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
              <StatusChip status={equipment.status} />
            </Stack>}
            <Typography sx={{ mt: 1.1, fontSize: 22, fontWeight: 700 }}>{equipment.itemNameKor}</Typography>
            <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 13 }}>{equipment.itemNum}</Typography>
          </Box>
          <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'flex-start' }}>
            {equipment.imageUrl && <Box component="img" src={equipment.imageUrl} alt={`${equipment.itemNameKor} 사진`} loading="lazy"
              sx={{ width: 156, height: 112, objectFit: 'contain', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />}
            {!embedded && <Button variant="outlined" startIcon={<CalendarMonthOutlined />}
              onClick={() => navigate(equipment.databaseDetails ? '/deliveries' : `/deliveries?itemId=${equipment.itemId}`)}>
              {equipment.databaseDetails ? '전체 납품 달력' : '납품 일정'}
            </Button>}
            {!embedded && !equipment.databaseDetails && <Button variant="outlined" startIcon={<History />}
              onClick={() => navigate(`/history?itemId=${equipment.itemId}`)}>변경 이력</Button>}
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 2 }}>
          <SummaryItem icon={<BusinessOutlined fontSize="small" />} label="적용 사업" value={`${businesses.length}개`} />
          <SummaryItem icon={<PrecisionManufacturingOutlined fontSize="small" />} label="제조사" value={equipment.manufacturer || '-'} />
          <SummaryItem icon={<PersonOutlined fontSize="small" />} label="주 담당자" value={primaryManager?.name ?? equipment.managers[0]?.name ?? '-'} />
          <SummaryItem icon={<CalendarMonthOutlined fontSize="small" />} label="납품 기록" value={`${equipment.databaseDetails?.deliveries.length ?? deliveries.length}건`} />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)' }, gap: 2 }}>
        <Stack spacing={2}>
          <SectionCard title="기본정보">
            <Box sx={{ px: 2, py: 1.1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3 }}>
              <Box>
                <InfoRow label="품번">{equipment.itemNum}</InfoRow>
                <InfoRow label="KAI 품번">{displayDetail(equipment.kaiPartNumber)}</InfoRow>
                <InfoRow label="재고번호 (NSN)">{displayDetail(equipment.itemNsn)}</InfoRow>
                <InfoRow label="통상명칭">{displayDetail(equipment.commonName)}</InfoRow>
                <InfoRow label="국문 품명">{equipment.itemNameKor}</InfoRow>
                <InfoRow label="영문 품명">{displayDetail(equipment.itemNameEng)}</InfoRow>
                <InfoRow label="국문 용도">{displayDetail(equipment.itemUsageKor)}</InfoRow>
                <InfoRow label="영문 용도">{displayDetail(equipment.itemUsageEng)}</InfoRow>
              </Box>
              <Box>
                <InfoRow label="장비 구분">{displayDetail(equipment.category.name)}</InfoRow>
                <InfoRow label="품목 구분">{displayDetail(equipment.itemType)}</InfoRow>
                <InfoRow label="장비 사진">{equipment.imageUrl ? '등록됨' : unavailable}</InfoRow>
                <InfoRow label="감모 여부">{equipment.databaseDetails
                  ? (equipment.databaseDetails.diminishing ? '해당' : '비해당') : unavailable}</InfoRow>
                <InfoRow label="제조사">{displayDetail(equipment.manufacturer)}</InfoRow>
                <InfoRow label="사용 상태">{equipment.status === '미확인' ? unavailable : <StatusChip status={equipment.status} />}</InfoRow>
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
                    <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 11 }}>{manager.role ?? unavailable}</Typography>
                  </Box>
                  <Chip label={manager.assignmentType ?? '구분 미연결'} size="small" variant="outlined" color={manager.assignmentType === '정' ? 'primary' : 'default'} />
                </Box>
              ))}
            </Box>
          </SectionCard>

          {detailGroups(equipment).map(({ title, rows }) => (
            <SectionCard key={title} title={title}>
              <Box sx={{ px: 2, py: 1.1 }}>
                {rows.map(([label, value]) => <InfoRow key={label} label={label}>{value}</InfoRow>)}
              </Box>
            </SectionCard>
          ))}

          <SectionCard title="납품 요약">
            <Box sx={{ px: 2, py: 1.1 }}>
              <InfoRow label="주요 납지"><LabelList values={destinations} /></InfoRow>
              <InfoRow label="납품 일정">{deliveries.length}건</InfoRow>
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

      {equipment.databaseDetails && <SectionCard title={`납품·입고 상세 이력 (${equipment.databaseDetails.deliveries.length}건)`}>
        <TableContainer sx={{ maxHeight: 460 }}>
          <Table size="small" stickyHeader aria-label="실DB 납품 입고 이력">
            <TableHead><TableRow>
              {['차수', '납품부대', '조달원', '바이어', '수량', '납품 예정일', '입고 예정', '입고일', '납품일', 'PR', 'PO', '계약 단가', '입고 보증일', '납품 보증일'].map((title) => <TableCell key={title} sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{title}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {equipment.databaseDetails.deliveries.map((row) => <TableRow key={row.matchId} hover>
                {[row.subContractName, row.destination, row.vendorName, row.buyerName,
                  row.quantity, row.contractDate, row.receivingExpected, row.receivedAt, row.deliveredAt,
                  row.purchaseRequestNumber, row.purchaseOrderNumber,
                  row.contractPrice, row.receivingWarrantyDate, row.deliveryWarrantyDate].map((value, index) =>
                  <TableCell key={index} sx={{ whiteSpace: 'nowrap' }}>{displayDetail(value)}</TableCell>)}
              </TableRow>)}
              {equipment.databaseDetails.deliveries.length === 0 && <TableRow><TableCell colSpan={14}>등록된 납품 이력이 없습니다.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>}

      <Paper variant="outlined" sx={{ mt: 2, px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Inventory2Outlined sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
          ‘미연결’은 현재 조회에서 확인할 수 있는 값이 없는 항목입니다.
        </Typography>
      </Paper>
    </Box>
  );
}
