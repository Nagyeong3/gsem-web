import { Close, History, OpenInNew } from '@mui/icons-material';
import { Alert, Box, Button, Chip, IconButton, LinearProgress, Paper, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { Equipment } from '../../../types/domain';
import { StatusChip } from '../../../components/common/StatusChip';
import { detailGroups, displayDetail, unavailable } from '../detailFields';
import { getAircraftTypes, getBusinesses, getDestinations } from '../equipmentSearch';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.45 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 500 }}>{displayDetail(value)}</Typography>
    </Box>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ mb: 0.75, fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      {children}
    </Box>
  );
}

export function EquipmentDetail({
  equipment,
  onClose,
  onOpenFullDetail, loading, error, onRetry,
}: {
  equipment: Equipment;
  onClose: () => void;
  onOpenFullDetail: () => void;
  loading?: boolean; error?: boolean; onRetry?: () => void;
}) {
  const businesses = getBusinesses(equipment);
  const aircraftTypes = getAircraftTypes(equipment);
  const destinations = getDestinations(equipment);

  return (
    <Paper
      component="aside"
      variant="outlined"
      aria-label="선택 장비 상세"
      sx={{
        width: '100%', minWidth: 0, maxHeight: theme => `calc(100dvh - ${theme.layout.headerHeight + 28}px)`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          height: 52, flexShrink: 0,
          px: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>장비 상세</Typography>
        <IconButton size="small" aria-label="상세 패널 닫기" onClick={onClose}>
          <Close sx={{ fontSize: 19 }} />
        </IconButton>
      </Box>

      {loading && <LinearProgress aria-label="장비 상세 조회 중" />}
      {error && <Alert severity="error" action={<Button size="small" onClick={onRetry}>재시도</Button>}>상세 정보를 불러오지 못했습니다.</Alert>}
      <Box sx={{ px: 2.25, py: 1.75, overflowY: 'auto', minHeight: 0, overscrollBehavior: 'contain', overflowWrap: 'anywhere' }} key={equipment.itemId}>
        {!equipment.databaseDetails && <StatusChip status={equipment.status} />}
        <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 700 }}>
          {equipment.itemNameKor}
        </Typography>
        <Typography sx={{ mt: 0.25, color: 'text.secondary' }}>{equipment.itemNum}</Typography>

        {equipment.imageUrl && <Box component="img" src={equipment.imageUrl} alt={`${equipment.itemNameKor} 사진`} loading="lazy" sx={{ mt: 1, width: '100%', height: 130, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }} />}
        <DetailSection title="기본정보">
          <DetailRow label="품번" value={equipment.itemNum} />
          <DetailRow label="KAI 품번" value={displayDetail(equipment.kaiPartNumber)} />
          <DetailRow label="통상명칭" value={displayDetail(equipment.commonName)} />
          <DetailRow label="품목 구분" value={displayDetail(equipment.itemType)} />
          <DetailRow label="사용 상태" value={equipment.status === '미확인' ? unavailable : equipment.status} />
          <DetailRow label="재고번호 (NSN)" value={displayDetail(equipment.itemNsn)} />
          <DetailRow label="품명" value={equipment.itemNameKor} />
          <DetailRow label="영문 품명" value={equipment.itemNameEng} />
          <DetailRow label="장비 구분" value={equipment.category.name} />
          <DetailRow label="제조사" value={equipment.manufacturer} />
          {equipment.databaseDetails && <DetailRow label="납품 기록" value={`${equipment.databaseDetails.deliveries.length}건`} />}
        </DetailSection>

        <DetailSection title="적용정보">
          <DetailRow label="기종" value={aircraftTypes.join(' · ') || '-'} />
          <DetailRow label="사업" value={businesses.join(' · ') || '-'} />
          <DetailRow
            label="계통"
            value={equipment.systems.map((system) => system.name).join(' · ') || '-'}
          />
          <DetailRow
            label="정비 계단"
            value={equipment.maintenanceLevels.map((level) => level.name).join(' · ') || '-'}
          />
        </DetailSection>

        <DetailSection title="담당자">
          {equipment.managers.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>담당자 미연결</Typography>
          ) : (
            equipment.managers.map((manager) => (
              <Box
                key={`${manager.id}-${manager.role}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '44px 72px 1fr',
                  alignItems: 'center',
                  gap: 0.75,
                  py: 0.5,
                }}
              >
                <Chip
                  label={manager.assignmentType ?? '미지정'}
                  size="small"
                  variant="outlined"
                  color={manager.assignmentType === '정' ? 'primary' : 'default'}
                />
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{manager.name}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {manager.role ?? '역할 미지정'}
                </Typography>
              </Box>
            ))
          )}
        </DetailSection>

        <DetailSection title="용도 및 납품">
          <DetailRow label="용도" value={equipment.itemUsageKor} />
          <DetailRow label="영문 용도" value={equipment.itemUsageEng} />
          <DetailRow label="주요 납지" value={destinations.join(' · ') || '-'} />
          {equipment.databaseDetails && <DetailRow label="조달원"
            value={[...new Set(equipment.databaseDetails.deliveries.map((row) => row.vendorName).filter(Boolean))].join(' · ') || '-'} />}
        </DetailSection>

        {detailGroups(equipment).map(({ title, rows }) => (
          <DetailSection key={title} title={title}>
            {rows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
          </DetailSection>
        ))}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 1, pt: 1.25 }}>
          <Tooltip title="변경 이력은 후속 프로토타입 범위입니다.">
            <span>
              <Button fullWidth variant="outlined" startIcon={<History />} disabled>
                변경 이력
              </Button>
            </span>
          </Tooltip>
          <Button
            fullWidth
            variant="contained"
            endIcon={<OpenInNew />}
            onClick={onOpenFullDetail}
          >
            전체 상세
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

