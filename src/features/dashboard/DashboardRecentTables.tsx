import { ChevronRight } from '@mui/icons-material';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { SectionCard } from '../../components/common/SectionCard';
import { StatusChip } from '../../components/common/StatusChip';
import type { DashboardData } from '../../types/domain';

export function DashboardRecentTables({ changes, upcomingDeliveries }: {
 changes: DashboardData['changes'];
 upcomingDeliveries: DashboardData['upcomingDeliveries'];
}) {
 const data = { changes, upcomingDeliveries };
 return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 1.5 }}>
        <SectionCard
          title="최근 변경 이력"
          action={
            <Button size="small" endIcon={<ChevronRight />}>
              전체 보기
            </Button>
          }
        >
          <Table size="small" aria-label="최근 변경 이력">
            <TableHead>
              <TableRow>
                <TableCell>변경 번호</TableCell>
                <TableCell>품명</TableCell>
                <TableCell>변경 내용</TableCell>
                <TableCell>변경 구분</TableCell>
                <TableCell>요청자</TableCell>
                <TableCell>변경일</TableCell>
                <TableCell align="center">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.changes.map((change) => (
                <TableRow key={change.id} hover>
                  <TableCell>{change.id}</TableCell>
                  <TableCell>{change.equipmentName}</TableCell>
                  <TableCell>{change.content}</TableCell>
                  <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {change.category}
                  </TableCell>
                  <TableCell>{change.requester}</TableCell>
                  <TableCell>{change.changedAt}</TableCell>
                  <TableCell align="center">
                    <StatusChip status={change.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="납품 임박 품목"
          action={
            <Button size="small" endIcon={<ChevronRight />}>
              전체 보기
            </Button>
          }
        >
          <Table size="small" aria-label="납품 임박 품목">
            <TableHead>
              <TableRow>
                <TableCell>품명</TableCell>
                <TableCell>품번</TableCell>
                <TableCell>납품 예정일</TableCell>
                <TableCell>D-일</TableCell>
                <TableCell align="center">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.upcomingDeliveries.map((delivery) => (
                <TableRow key={delivery.itemNum} hover>
                  <TableCell>{delivery.equipmentName}</TableCell>
                  <TableCell>{delivery.itemNum}</TableCell>
                  <TableCell>{delivery.deliveryDate}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>
                    D-{delivery.daysLeft}
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={delivery.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </Box>
 );
}
