import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, TextField, Typography, type SelectChangeEvent } from '@mui/material';
import { Close, SaveOutlined } from '@mui/icons-material';
import type { EquipmentMasterItem, RiskLevel, UnitDelivery } from '../../types/equipmentMaster';
import { progressOptions } from '../../data/equipmentMasterMock';
import { inferProgressTone } from './model';

function EditTextField({ label, value, onChange, multiline = false, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; multiline?: boolean; type?: string }) {
  return <TextField size="small" label={label} value={value} type={type} multiline={multiline} minRows={multiline ? 3 : undefined} onChange={(event) => onChange(event.target.value)} fullWidth />;
}

function EditSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <FormControl size="small" fullWidth><InputLabel>{label}</InputLabel><Select value={value} label={label} onChange={(event: SelectChangeEvent) => onChange(event.target.value)}>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>;
}

export function EditDialog({ draft, onChange, onClose, onSave }: { draft: EquipmentMasterItem | null; onChange: (draft: EquipmentMasterItem) => void; onClose: () => void; onSave: () => void }) {
  if (!draft) return null;
  const updateDelivery = (index: number, patch: Partial<UnitDelivery>) => {
    onChange({ ...draft, deliveries: draft.deliveries.map((delivery, deliveryIndex) => deliveryIndex === index ? { ...delivery, ...patch } : delivery) });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        <Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>지원장비 마스터 행 수정</Typography><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>컬럼 성격에 맞는 입력 방식으로 Mock 데이터를 수정합니다. 저장 내용은 현재 화면에서만 유지됩니다.</Typography></Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>기본 / 조달 정보</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.25 }}>
            <EditSelect label="RISK" value={draft.risk} options={['G', 'Y', 'R']} onChange={(value) => onChange({ ...draft, risk: value as RiskLevel })} />
            <EditTextField label="품명(국문)" value={draft.itemNameKor} onChange={(value) => onChange({ ...draft, itemNameKor: value })} />
            <EditTextField label="품번" value={draft.itemNumber} onChange={(value) => onChange({ ...draft, itemNumber: value })} />
            <EditTextField label="Material" value={draft.material} onChange={(value) => onChange({ ...draft, material: value })} />
            <EditTextField label="담당 바이어" value={draft.buyer} onChange={(value) => onChange({ ...draft, buyer: value })} />
            <EditTextField label="조달원" value={draft.supplier} onChange={(value) => onChange({ ...draft, supplier: value })} />
            <EditSelect label="진행 상세현황" value={draft.progress} options={progressOptions.map((option) => option.label)} onChange={(value) => onChange({ ...draft, progress: value, progressTone: inferProgressTone(value) })} />
            <EditTextField label="TDT CODE" value={draft.tdtCode} onChange={(value) => onChange({ ...draft, tdtCode: value })} />
            <Box sx={{ gridColumn: '1 / -1' }}><EditTextField label="장비설명" value={draft.description} multiline onChange={(value) => onChange({ ...draft, description: value })} /></Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>부대별 계약 / 입고 / 납품</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {draft.deliveries.map((delivery, index) => (
              <Box key={delivery.unitName} sx={{ display: 'grid', gridTemplateColumns: '1.45fr 0.8fr repeat(4, 1fr) 0.65fr', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{delivery.unitName}</Typography>
                <EditSelect label="계약" value={delivery.contracted ? '계약' : '미계약'} options={['계약', '미계약']} onChange={(value) => updateDelivery(index, { contracted: value === '계약' })} />
                <EditTextField label="입고예정" value={delivery.inboundExpected ?? ''} onChange={(value) => updateDelivery(index, { inboundExpected: value })} />
                <EditTextField label="납품계획" value={delivery.deliveryPlan ?? ''} onChange={(value) => updateDelivery(index, { deliveryPlan: value })} />
                <EditTextField label="입고" value={delivery.inboundActual ?? ''} onChange={(value) => updateDelivery(index, { inboundActual: value })} />
                <EditTextField label="납품" value={delivery.deliveredAt ?? ''} onChange={(value) => updateDelivery(index, { deliveredAt: value })} />
                <EditTextField label="수량" value={delivery.quantity} type="number" onChange={(value) => updateDelivery(index, { quantity: Number(value) || 0 })} />
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>정비 / 운영 기준</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.25 }}>
            <EditTextField label="납품 우선순위" value={draft.maintenance.priority} type="number" onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, priority: Number(value) || 0 } })} />
            <EditSelect label="운영/서비스성" value={draft.maintenance.serviceable} options={['O', '△', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, serviceable: value as 'O' | '△' | '-' } })} />
            <EditTextField label="100시간" value={draft.maintenance.hour100} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, hour100: value } })} />
            <EditTextField label="600시간" value={draft.maintenance.hour600} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, hour600: value } })} />
            <EditTextField label="주기검사" value={draft.maintenance.periodicInspection} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, periodicInspection: value } })} />
            <EditSelect label="계획" value={draft.maintenance.planned} options={['O', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, planned: value as 'O' | '-' } })} />
            <EditSelect label="비계획" value={draft.maintenance.unplanned} options={['O', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, unplanned: value as 'O' | '-' } })} />
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" startIcon={<SaveOutlined />} onClick={onSave}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

