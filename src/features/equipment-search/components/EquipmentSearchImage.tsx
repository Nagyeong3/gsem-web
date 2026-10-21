import { Box } from '@mui/material';
import type { Equipment } from '../../../types/domain';

function getEquipmentImageDataUrl(equipment: Equipment) {
  const label = equipment.itemNum || equipment.itemNameKor || 'GSEM';
  const title = label.slice(0, 18);
  const subtitle = (equipment.category?.name || '지원장비').slice(0, 18);
  const seed = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = seed % 360;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 70%, 92%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 42) % 360}, 68%, 78%)"/>
        </linearGradient>
      </defs>
      <rect width="360" height="240" rx="24" fill="url(#bg)"/>
      <rect x="42" y="56" width="276" height="118" rx="16" fill="rgba(255,255,255,0.82)" stroke="rgba(15,23,42,0.12)"/>
      <rect x="72" y="88" width="216" height="18" rx="9" fill="rgba(15,23,42,0.22)"/>
      <rect x="96" y="122" width="168" height="14" rx="7" fill="rgba(15,23,42,0.14)"/>
      <circle cx="282" cy="72" r="22" fill="rgba(37,99,235,0.18)"/>
      <text x="180" y="198" text-anchor="middle" fill="#0f172a" font-size="22" font-weight="700" font-family="Arial, sans-serif">${title}</text>
      <text x="180" y="221" text-anchor="middle" fill="#475569" font-size="15" font-family="Arial, sans-serif">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function EquipmentImagePreview({ equipment }: { equipment: Equipment }) {
  const imageUrl = getEquipmentImageDataUrl(equipment);
  const alt = `${equipment.itemNameKor || equipment.itemNum} 이미지`;

  return (
    <Box className="equipment-thumbnail-trigger" sx={{ position: 'relative', width: 54, height: 38 }}>
      <Box
        component="img"
        src={imageUrl}
        alt={alt}
        sx={{
          width: 54,
          height: 38,
          objectFit: 'cover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'block',
        }}
      />
      <Box
        className="equipment-image-preview"
        sx={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360,
          height: 240,
          p: 1,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 10,
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 1500,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 120ms ease',
          '.equipment-thumbnail-trigger:hover &': {
            opacity: 1,
          },
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={alt}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 1.5,
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
}


