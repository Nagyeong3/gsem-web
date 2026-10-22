import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useId } from 'react';

export function FilterSelect({ label, value, options, onChange, fullWidth = true }: {
  id?: string; label: string; value: string; options: string[]; onChange: (value: string) => void; fullWidth?: boolean;
}) {
  const labelId = useId();
  return <FormControl size="small" fullWidth={fullWidth} sx={{ minWidth: 154 }}>
    <InputLabel id={labelId}>{label}</InputLabel>
    <Select labelId={labelId} label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="">전체</MenuItem>
      {[...new Set(value ? [value, ...options] : options)].map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
    </Select>
  </FormControl>;
}
