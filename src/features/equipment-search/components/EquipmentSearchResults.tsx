import { Paper, Radio, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { ColumnResizeHandle } from '../../../components/common/ColumnResizeHandle';
import { QueryStatePanel } from '../../../components/common/QueryStatePanel';
import { StatusChip } from '../../../components/common/StatusChip';
import { getAircraftTypes, getBusinesses, getDestinations, summarize, summarizeManagers } from '../equipmentSearch';
import type { Equipment, EquipmentSortKey, SortDirection } from '../../../types/domain';
import { EquipmentImagePreview } from './EquipmentSearchImage';
import type { useColumnWidths } from '../../../hooks/useColumnWidths';
import { columns } from '../searchConfig';

export function EquipmentSearchResults({ equipment, selectedId, isLoading, isError, refetch, resetFilters, sortKey, sortDirection, changeSort, onSelect, columnWidths }: {
  columnWidths: ReturnType<typeof useColumnWidths>;
  equipment: Equipment[];
  selectedId: number | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  resetFilters: () => void;
  sortKey: EquipmentSortKey;
  sortDirection: SortDirection;
  changeSort: (key: EquipmentSortKey) => void;
  onSelect: (id: number) => void;
}) {
  return (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {isLoading ? (
            <QueryStatePanel state="loading" loadingMessage="장비 정보를 불러오고 있습니다." minHeight={302} />
          ) : isError ? (
            <QueryStatePanel state="error" errorMessage="장비 정보를 불러오지 못했습니다." onRetry={refetch} minHeight={302} />
          ) : equipment.length === 0 ? (
            <QueryStatePanel state="empty" emptyMessage="검색 결과가 없습니다." emptyDescription="검색어 또는 필터 조건을 변경해보세요." onReset={resetFilters} minHeight={302} />
          ) : (
            <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Table
                size="small"
                aria-label="장비 검색 결과"
                sx={{
                  tableLayout: 'fixed',
                  width: 112 + columns.reduce((sum, column) => sum + (columnWidths.widths[column.key] ?? 112), 0),
                  minWidth: 850,
                  '& .MuiTableCell-root': {
                    px: 0.75,
                    maxWidth: 112,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              >
                <colgroup><col style={{ width: 42 }} /><col style={{ width: 70 }} />{columns.map((column) => <col key={column.key} style={{ width: columnWidths.widths[column.key] ?? 112 }} />)}</colgroup>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 42 }} />
                    <TableCell sx={{ width: 70 }}>이미지</TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key} sx={{ position: 'relative' }}>
                        <TableSortLabel
                          active={sortKey === column.key}
                          direction={sortKey === column.key ? sortDirection : 'asc'}
                          onClick={() => changeSort(column.key)}
                        >
                          {column.label}
                        </TableSortLabel>
                        <ColumnResizeHandle label={column.label} width={columnWidths.widths[column.key] ?? 112} defaultWidth={112}
                          onWidth={(width) => columnWidths.setWidth(column.key, width)}
                          onResize={(event) => columnWidths.beginResize(column.key, columnWidths.widths[column.key] ?? 112, event)} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.map((item) => {
                    const selected = selectedId === item.itemId;
                    return (
                      <TableRow
                        key={item.itemId}
                        hover
                        selected={selected}
                        aria-selected={selected}
                        onClick={() => onSelect(item.itemId)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect(item.itemId);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(108,168,255,0.14)'
                                : '#EEF5FF',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(108,168,255,0.2)'
                                : '#E4F0FF',
                          },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Radio
                            checked={selected}
                            size="small"
                            slotProps={{
                              input: { 'aria-label': `${item.itemNameKor} 선택` },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EquipmentImagePreview equipment={item} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{item.itemNum}</TableCell>
                        <TableCell>{item.itemNameKor}</TableCell>
                        <TableCell>{summarize(getAircraftTypes(item))}</TableCell>
                        <TableCell>{summarize(getBusinesses(item))}</TableCell>
                        <TableCell>
                          {summarize(item.systems.map((system) => system.name))}
                        </TableCell>
                        <TableCell>{item.category.name}</TableCell>
                        <TableCell>{summarizeManagers(item)}</TableCell>
                        <TableCell>{summarize(getDestinations(item))}</TableCell>
                        <TableCell>
                          <StatusChip status={item.status} />
                        </TableCell>
                        <TableCell>{item.recentChangeDate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

  );
}
