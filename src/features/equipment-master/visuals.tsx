import { useState, type ReactNode } from 'react';
import { Box, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, type SelectChangeEvent } from '@mui/material';
import { Close, EditOutlined } from '@mui/icons-material';
import { runtimeConfig } from '../../config/runtime';
import type { EquipmentMasterItem, RiskLevel } from '../../types/equipmentMaster';
import { equipmentImageDataUrl, getRiskStyle, getProgressStyle, realDataMode } from './model';

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const style = getRiskStyle(risk);
  return <Chip label={style.label} size="small" sx={{ minWidth: 28, height: 28, borderRadius: 999, bgcolor: style.color, color: '#FFFFFF', fontWeight: 800, '& .MuiChip-label': { px: 0 } }} />;
}

export function ProgressChip({ item }: { item: EquipmentMasterItem }) {
  const style = getProgressStyle(item.progressTone);
  return <Chip label={item.progress} size="small" sx={{ bgcolor: style.bg, color: style.color, border: `1px solid ${style.color}33`, fontWeight: 700, maxWidth: 138, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />;
}

function DbImage({ item }: { item: EquipmentMasterItem }) {
  const [missing, setMissing] = useState(false);
  const url = `${runtimeConfig.apiBaseUrl}/equipment-master/image/${item.itemId}`;
  if (missing) return <Box sx={{ width: 58, height: 42, border: '1px solid', borderColor: 'divider', color: 'text.secondary', fontSize: 10, display: 'grid', placeItems: 'center' }}>미연결</Box>;
  return <Box className="equipment-master-thumbnail" sx={{ position: 'relative', width: 58, height: 42 }}>
    <Box component="img" src={url} onError={() => setMissing(true)} alt={`${item.itemNameKor} 이미지`} sx={{ width: 58, height: 42, objectFit: 'contain', display: 'block' }} />
    <Box sx={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1600, width: 400, height: 300, bgcolor: 'background.paper', boxShadow: 10, p: 1, opacity: 0, pointerEvents: 'none', '.equipment-master-thumbnail:hover &': { opacity: 1 } }}>
      <Box component="img" src={url} alt={`${item.itemNameKor} 확대`} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>
  </Box>;
}
export function EquipmentThumbnail({ item }: { item: EquipmentMasterItem }) {
  if (realDataMode) return item.imagePath && item.itemId ? <DbImage item={item} /> : <Box sx={{ width: 58, height: 42, border: '1px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', fontSize: 10 }}>이미지 없음</Box>;
  const src = equipmentImageDataUrl(item);
  const largeSrc = equipmentImageDataUrl(item, true);
  const alt = `${item.itemNameKor} 장비형상`;
  return (
    <Box className="equipment-master-thumbnail" sx={{ position: 'relative', width: 58, height: 42 }}>
      <Box component="img" src={src} alt={alt} sx={{ width: 58, height: 42, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'block' }} />
      <Box sx={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 360, height: 220, p: 1, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 10, border: '1px solid', borderColor: 'divider', zIndex: 1600, opacity: 0, pointerEvents: 'none', transition: 'opacity 120ms ease', '.equipment-master-thumbnail:hover &': { opacity: 1 } }}>
        <Box component="img" src={largeSrc} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5 }} />
      </Box>
    </Box>
  );
}

export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <FormControl size="small" sx={{ minWidth: 154 }}><InputLabel>{label}</InputLabel><Select value={value} label={label} onChange={(event: SelectChangeEvent) => onChange(event.target.value)}><MenuItem value="">전체</MenuItem>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>;
}

export function SummaryCard({ label, value, helper, tone = '#0F6BFF' }: { label: string; value: string; helper: string; tone?: string }) {
  return <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minHeight: 92 }}><Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.5, color: tone, fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</Typography><Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11 }}>{helper}</Typography></Paper>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.55 }}><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography><Typography component="div" sx={{ color: 'text.primary', fontSize: 12, fontWeight: 600 }}>{value || '-'}</Typography></Box>;
}

function DetailSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Box sx={{ py: 1.6, borderTop: '1px solid', borderColor: 'divider' }}><Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 14, fontWeight: 800 }}>{title}</Typography>{action}</Box>{children}</Box>;
}

export function DetailPanel({ item, onClose, onEdit }: { item: EquipmentMasterItem; onClose: () => void; onEdit: (item: EquipmentMasterItem) => void }) {
  return (
    <Paper component="aside" square elevation={0} sx={{ width: 376, flex: '0 0 376px', minHeight: 'calc(100vh - 58px)', borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ height: 52, px: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>장비 상세</Typography>
        <IconButton size="small" aria-label="상세 패널 닫기" onClick={onClose}><Close sx={{ fontSize: 19 }} /></IconButton>
      </Box>
      <Box sx={{ px: 2.25, py: 1.75 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 54px', gap: 1.25, alignItems: 'stretch' }}>
          <Box component="img" src={realDataMode ? (item.itemId && item.imagePath ? `${runtimeConfig.apiBaseUrl}/equipment-master/image/${item.itemId}` : undefined) : equipmentImageDataUrl(item, true)} alt={`${item.itemNameKor} 장비형상`} sx={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{(realDataMode ? [] : [0, 1, 2]).map((index) => <Box key={index} component="img" src={equipmentImageDataUrl(item)} alt={`${item.itemNameKor} 썸네일 ${index + 1}`} sx={{ width: 54, height: 50, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: index === 0 ? 'primary.main' : 'divider' }} />)}</Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.75 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{item.itemNameKor}</Typography>
          <Chip label={item.risk === 'R' ? 'Risk' : item.risk === 'Y' ? '주의' : item.risk === '?' ? 'RISK 미등록' : '정상'} size="small" color={item.risk === 'R' ? 'error' : item.risk === 'Y' ? 'warning' : 'success'} variant="outlined" />
        </Box>
        <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 13 }}>{item.itemNumber}</Typography>
        <Button fullWidth variant="contained" disabled={realDataMode} startIcon={<EditOutlined />} sx={{ mt: 1.5 }} onClick={() => onEdit(item)}>이 품목 수정</Button>
        <DetailSection title="기본정보">
          <DetailRow label="품명" value={item.itemNameKor} />
          <DetailRow label="사업명" value={item.businessName || '-'} />
          <DetailRow label="담당자" value={item.managerName || '-'} />
          <DetailRow label="품번" value={item.itemNumber} />
          <DetailRow label="Material" value={item.material} />
          <DetailRow label="담당 바이어" value={item.buyer} />
          <DetailRow label="조달원" value={item.supplier} />
          <DetailRow label="진행 상태" value={<ProgressChip item={item} />} />
          <DetailRow label="TDT CODE" value={item.tdtCode} />
        </DetailSection>
        <DetailSection title="부대별 납품현황" action={<Button size="small" disabled={realDataMode} onClick={() => onEdit(item)}>수정</Button>}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 212 }}>
            <Table size="small" stickyHeader aria-label="부대별 납품현황">
              <TableHead><TableRow>{['부대명', '계약', '입고예정', '납품계획', '수량'].map((header) => <TableCell key={header} sx={{ fontSize: 11, fontWeight: 800 }}>{header}</TableCell>)}</TableRow></TableHead>
              <TableBody>{item.deliveries.map((delivery) => <TableRow key={delivery.unitName}><TableCell sx={{ fontSize: 11, fontWeight: 700 }}>{delivery.unitName.replace('(파견중대 포함)', '')}</TableCell><TableCell>{delivery.contracted ? '●' : '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.inboundExpected || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.deliveryPlan || '-'}</TableCell><TableCell align="right" sx={{ fontSize: 11, fontWeight: 800 }}>{delivery.quantity}</TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </DetailSection>
        {realDataMode && <DetailSection title="정합성 확인">
          {item.validationIssues?.length ? item.validationIssues.map((issue, index) => <Typography key={`${issue}-${index}`} color="warning.main" sx={{ fontSize: 12, mb: 0.5 }}>• {issue}</Typography>) : <Typography sx={{ fontSize: 12 }}>현재 조회된 계약 데이터에서 이상 항목 없음 (전수검증 결과 아님)</Typography>}
        </DetailSection>}
        {realDataMode && <DetailSection title="개별 계약·납품 내역 (합산 근거)">
          {item.contractLines?.length ? <TableContainer sx={{ maxHeight: 270 }}><Table size="small" stickyHeader><TableHead><TableRow>{['계약', '납지', '수량', '입고예정', '입고', '납품'].map((key) => <TableCell key={key} sx={{ fontSize: 11, fontWeight: 800 }}>{key}</TableCell>)}</TableRow></TableHead><TableBody>{item.contractLines.map((line) => <TableRow key={line.matchId}><TableCell sx={{ fontSize: 11 }}>{line.subContractName} (#{line.matchId})</TableCell><TableCell sx={{ fontSize: 11 }}>{line.destination}</TableCell><TableCell>{line.quantity ?? '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.receivingExpected || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.receivedAt || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.deliveredAt || '-'}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Typography sx={{ fontSize: 12 }}>연결된 계약·납품정보 없음</Typography>}
        </DetailSection>}
        <DetailSection title="정비 / 운영 정보">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <InfoTile label="납품 우선순위" value={item.maintenance.priority ? `${item.maintenance.priority}순위` : '-'} />
            <InfoTile label="운영/서비스성" value={item.maintenance.serviceable} />
            <InfoTile label="100시간" value={item.maintenance.hour100} />
            <InfoTile label="600시간" value={item.maintenance.hour600} />
            <InfoTile label="주기검사" value={item.maintenance.periodicInspection} />
            <InfoTile label="계획/비계획" value={`${item.maintenance.planned} / ${item.maintenance.unplanned}`} />
          </Box>
        </DetailSection>
      </Box>
    </Paper>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <Box sx={{ p: 1.1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}><Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.4, fontSize: 13, fontWeight: 800 }}>{value}</Typography></Box>;
}

