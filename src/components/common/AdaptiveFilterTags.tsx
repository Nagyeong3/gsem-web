import { useEffect, useRef, useState } from 'react';
import { Box, Chip, type SxProps, type Theme } from '@mui/material';
import type { AutocompleteRenderValueGetItemProps } from '@mui/material/Autocomplete';

/** 실제 칩 너비를 측정해 가용 공간에 들어가는 선택값을 표시한다. */
export function AdaptiveFilterTags({ labels, getItemProps, chipSx }: {
  labels: readonly string[];
  getItemProps: AutocompleteRenderValueGetItemProps<true>;
  chipSx?: (index: number) => SxProps<Theme>;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [capacity, setCapacity] = useState(labels.length);
  const labelKey = JSON.stringify(labels);
  useEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    const inputRoot = root?.closest('.MuiAutocomplete-inputRoot');
    if (!root || !measure || !inputRoot) return;
    const update = () => {
      const style = getComputedStyle(inputRoot);
      const room = Math.max(0, inputRoot.clientWidth - parseFloat(style.paddingLeft || '0')
        - parseFloat(style.paddingRight || '0') - 36);
      const sizes = Array.from(measure.children).map(child => child.getBoundingClientRect().width);
      if (sizes.reduce((sum, size) => sum + size + 4, 0) <= room) { setCapacity(sizes.length); return; }
      let used = 42;
      let count = 0;
      for (const size of sizes) {
        if (used + size + 4 > room) break;
        used += size + 4;
        count += 1;
      }
      setCapacity(count);
    };
    const observer = new ResizeObserver(update);
    observer.observe(inputRoot);
    observer.observe(measure);
    const frame = requestAnimationFrame(update);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [labelKey]);
  const count = Math.min(capacity, labels.length);
  return <Box component="span" ref={rootRef} sx={{ display: 'inline-flex', gap: 0.5, minWidth: 0, maxWidth: '100%' }}>
    <Box component="span" ref={measureRef} aria-hidden sx={{ position: 'fixed', visibility: 'hidden',
      pointerEvents: 'none', display: 'inline-flex', whiteSpace: 'nowrap', top: 0, left: 0 }}>
      {labels.map((label, index) => <Chip key={index} size="small" label={label} sx={chipSx?.(index)} onDelete={() => {}} />)}
    </Box>
    {labels.slice(0, count).map((label, index) => {
      const { key, ...props } = getItemProps({ index });
      return <Chip key={key} {...props} label={label} size="small" sx={chipSx?.(index)} />;
    })}
    {count < labels.length && <Chip size="small" label={`+${labels.length - count}`}
      title={labels.slice(count).join(', ')} aria-label={`추가 선택 ${labels.length - count}개`} />}
  </Box>;
}
