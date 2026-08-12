import { BrokenImageOutlined, Close, ZoomIn } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import { useId, useState, type FocusEvent, type MouseEvent } from 'react';
import type { EquipmentImage } from '../../types/domain';

interface EquipmentImageViewerProps {
  images: EquipmentImage[];
  equipmentName: string;
  variant?: 'thumbnail' | 'panel' | 'hero';
}

const dimensions = {
  thumbnail: { width: 44, height: 44 },
  panel: { width: '100%', height: 150 },
  hero: { width: 176, height: 112 },
} as const;

export function EquipmentImageViewer({
  images,
  equipmentName,
  variant = 'thumbnail',
}: EquipmentImageViewerProps) {
  const image = images.find((candidate) => candidate.isPrimary) ?? images[0];
  const [previewAnchor, setPreviewAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const dialogTitleId = useId();
  const size = dimensions[variant];
  const hasImage = Boolean(image) && !loadFailed;
  const showHoverPreview = variant === 'thumbnail' && hasImage && !dialogOpen;

  const openPreview = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    if (showHoverPreview) setPreviewAnchor(event.currentTarget);
  };

  const closePreview = () => setPreviewAnchor(null);

  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={`${equipmentName} 이미지 확대`}
        aria-haspopup="dialog"
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={openPreview}
        onBlur={closePreview}
        onClick={(event) => {
          event.stopPropagation();
          if (hasImage) {
            closePreview();
            setDialogOpen(true);
          }
        }}
        sx={{
          ...size,
          p: 0,
          flex: variant === 'panel' ? '1 1 auto' : '0 0 auto',
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.default',
          color: 'text.secondary',
          cursor: hasImage ? 'zoom-in' : 'default',
          '&:hover': hasImage ? { borderColor: 'primary.main' } : undefined,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {hasImage ? (
          <Box
            component="img"
            src={variant === 'thumbnail' ? image.thumbnailUrl : image.fullUrl}
            alt={image.alt}
            onError={() => setLoadFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <Box sx={{ display: 'grid', placeItems: 'center', gap: 0.4 }}>
            <BrokenImageOutlined sx={{ fontSize: variant === 'thumbnail' ? 20 : 28 }} />
            {variant !== 'thumbnail' && (
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>등록 이미지 없음</Typography>
            )}
          </Box>
        )}
        {variant !== 'thumbnail' && hasImage && (
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 28,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              bgcolor: 'rgba(9, 30, 53, 0.76)',
              color: '#FFFFFF',
            }}
          >
            <ZoomIn sx={{ fontSize: 18 }} />
          </Box>
        )}
      </Box>

      <Popper
        open={Boolean(previewAnchor) && showHoverPreview}
        anchorEl={previewAnchor}
        placement="right-start"
        modifiers={[{ name: 'offset', options: { offset: [0, 10] } }]}
        sx={{ zIndex: 1500, pointerEvents: 'none' }}
      >
        <Paper variant="outlined" sx={{ width: 320, p: 1, boxShadow: 4 }}>
          <Box
            component="img"
            src={image?.fullUrl}
            alt=""
            sx={{ width: '100%', height: 210, objectFit: 'contain', display: 'block' }}
          />
          <Typography sx={{ px: 0.5, pt: 0.75, fontSize: 12, fontWeight: 700 }}>
            {equipmentName}
          </Typography>
          <Typography sx={{ px: 0.5, color: 'text.secondary', fontSize: 10.5 }}>
            선택하면 원본 크기로 확인할 수 있습니다.
          </Typography>
        </Paper>
      </Popper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby={dialogTitleId}
      >
        <DialogTitle
          id={dialogTitleId}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}
        >
          <Typography component="span" sx={{ fontSize: 17, fontWeight: 700 }}>
            {equipmentName} 이미지
          </Typography>
          <IconButton aria-label="이미지 확대 닫기" onClick={() => setDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: 'background.default' }}>
          {image && (
            <Box
              component="img"
              src={image.fullUrl}
              alt={image.alt}
              sx={{ width: '100%', height: 520, objectFit: 'contain', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
