import { ArrowDownward, ArrowUpward, DeleteOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { defaultColumnLayout, resultColumns, type ColumnLayout, type LayoutPreset } from '../resultColumns';

export function EquipmentColumnDialog({ profile, layout, presets, onSwitchProfile, onSave, onClose }: {
  profile: string;
  layout: ColumnLayout;
  presets: LayoutPreset[];
  onSwitchProfile: (name: string) => void;
  onSave: (layout: ColumnLayout, presets: LayoutPreset[]) => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(layout);
  const [views, setViews] = useState(presets);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [profileName, setProfileName] = useState(profile);
  const [error, setError] = useState(false);
  const hasColumn = draft.some(column => column.visible && column.key !== 'image');

  const move = (index: number, step: number) => {
    setDraft(current => {
      const next = [...current];
      const [column] = next.splice(index, 1);
      next.splice(index + step, 0, column);
      return next;
    });
  };

  const addPreset = () => {
    const name = presetName.trim();
    if (!name || !hasColumn) return;
    setViews(current => [...current.filter(view => view.name !== name), { name, layout: draft }]);
    setSelectedPreset(name);
    setPresetName('');
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="equipment-columns-title">
      <DialogTitle id="equipment-columns-title">컬럼 설정</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>브라우저에 저장하지 못했습니다. 설정을 확인한 뒤 다시 시도하세요.</Alert>}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextField fullWidth size="small" label="사용자 프로필" value={profileName}
            slotProps={{ htmlInput: { maxLength: 80 } }} onChange={event => setProfileName(event.target.value)} />
          <Button sx={{ flexShrink: 0 }} disabled={!profileName.trim() || profileName.trim() === profile}
            onClick={() => onSwitchProfile(profileName.trim())}>전환</Button>
        </Box>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>이 브라우저에 사용자별 컬럼 설정을 저장합니다.</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextField select fullWidth size="small" label="저장한 보기" value={selectedPreset}
            onChange={event => {
              const value = event.target.value;
              setSelectedPreset(value);
              const view = views.find(entry => entry.name === value);
              if (view) setDraft(view.layout);
            }}>
            <MenuItem value="">선택</MenuItem>
            {views.map(view => <MenuItem key={view.name} value={view.name}>{view.name}</MenuItem>)}
          </TextField>
          <IconButton aria-label="선택한 보기 삭제" disabled={!selectedPreset} onClick={() => {
            setViews(current => current.filter(view => view.name !== selectedPreset));
            setSelectedPreset('');
          }}><DeleteOutlined /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField fullWidth size="small" label="보기 이름" value={presetName}
            slotProps={{ htmlInput: { maxLength: 60 } }} onChange={event => setPresetName(event.target.value)} />
          <Button sx={{ flexShrink: 0 }} disabled={!hasColumn || !presetName.trim()
            || (views.length >= 30 && !views.some(view => view.name === presetName.trim()))} onClick={addPreset}>
            보기 추가
          </Button>
        </Box>
        {draft.map((column, index) => {
          const label = resultColumns.find(item => item.key === column.key)!.label;
          return <Box key={column.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
            <FormControlLabel label={label} control={<Checkbox size="small" checked={column.visible}
              onChange={(_, visible) => setDraft(current => current.map(entry => entry.key === column.key ? { ...entry, visible } : entry))} />} />
            <Box>
              <IconButton size="small" aria-label={`${label} 위로`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUpward fontSize="small" /></IconButton>
              <IconButton size="small" aria-label={`${label} 아래로`} disabled={index === draft.length - 1} onClick={() => move(index, 1)}><ArrowDownward fontSize="small" /></IconButton>
            </Box>
          </Box>;
        })}
        {!hasColumn && <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>데이터 열을 한 개 이상 선택하세요.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setDraft(defaultColumnLayout); setSelectedPreset(''); }}>기본값</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!hasColumn} onClick={() => { if (!onSave(draft, views)) setError(true); }}>저장 및 적용</Button>
      </DialogActions>
    </Dialog>
  );
}
