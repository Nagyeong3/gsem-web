import {
  AssignmentOutlined,
  ChevronLeft,
  DashboardOutlined,
  ExpandMore,
  History,
  Menu,
  NotificationsNone,
  Search,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { label: '대시보드', icon: DashboardOutlined, path: '/', available: true },
  { label: '장비 검색', icon: Search, path: '/equipment', available: true },
  { label: '변경 이력', icon: History, path: '/history', available: false },
  { label: '변경 신청', icon: AssignmentOutlined, path: '/requests', available: false },
] as const;

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="aside"
        sx={{
          position: 'fixed',
          inset: '0 auto 0 0',
          zIndex: 1200,
          width: (theme) => theme.layout.sidebarWidth,
          color: '#FFFFFF',
          background: 'linear-gradient(180deg, #002B55 0%, #003664 55%, #002B55 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          '@media (max-width: 900px)': { display: 'none' },
        }}
      >
        <Box
          sx={{
            height: (theme) => theme.layout.headerHeight,
            display: 'flex',
            alignItems: 'center',
            px: 2.5,
            borderBottom: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
            }}
          >
            지원장비 관리시스템
          </Typography>
        </Box>

        <List component="nav" aria-label="주요 메뉴" sx={{ px: 1, py: 2 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected =
              item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Tooltip
                key={item.label}
                title={item.available ? '' : '후속 프로토타입에서 제공할 예정입니다.'}
                placement="right"
              >
                <ListItemButton
                  selected={selected}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => {
                    if (item.available) navigate(item.path);
                    else setNoticeOpen(true);
                  }}
                  sx={{
                    minHeight: 48,
                    mb: 0.75,
                    px: 1.5,
                    borderRadius: 1,
                    color: '#FFFFFF',
                    '&.Mui-selected': {
                      bgcolor: '#0867F2',
                      boxShadow: 'inset 3px 0 0 #69A7FF',
                    },
                    '&.Mui-selected:hover': { bgcolor: '#0759D3' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.09)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <Icon sx={{ fontSize: 22 }} />
                  </ListItemIcon>
                  <Typography sx={{ fontSize: 14, fontWeight: selected ? 700 : 500 }}>
                    {item.label}
                  </Typography>
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 8,
            right: 8,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <ListItemButton
            onClick={() => setNoticeOpen(true)}
            sx={{ borderRadius: 1, color: '#FFFFFF' }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <ChevronLeft fontSize="small" />
            </ListItemIcon>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>메뉴 접기</Typography>
          </ListItemButton>
        </Box>
      </Box>

      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: (theme) => theme.layout.sidebarWidth,
          zIndex: 1100,
          height: (theme) => theme.layout.headerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #D9E2EC',
          '@media (max-width: 900px)': { left: 0 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton aria-label="메뉴 열기" size="small" onClick={() => setNoticeOpen(true)}>
            <Menu sx={{ color: '#0B1B3D' }} />
          </IconButton>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>지원장비 관리시스템</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <IconButton aria-label="알림" size="small" onClick={() => setNoticeOpen(true)}>
            <NotificationsNone sx={{ color: '#273A59' }} />
          </IconButton>
          <Box sx={{ width: '1px', height: 24, bgcolor: '#D9E2EC', mx: 0.5 }} />
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#E8EDF3', color: '#66758C' }}>
            김
          </Avatar>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>김책임</Typography>
          <ExpandMore sx={{ fontSize: 18, color: '#52647D' }} />
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          ml: (theme) => `${theme.layout.sidebarWidth}px`,
          pt: (theme) => `${theme.layout.headerHeight}px`,
          '@media (max-width: 900px)': { ml: 0 },
        }}
      >
        {children}
      </Box>

      <Snackbar
        open={noticeOpen}
        autoHideDuration={2400}
        onClose={() => setNoticeOpen(false)}
        message="현재 1차 프로토타입 범위에는 포함되지 않은 기능입니다."
      />
    </Box>
  );
}
