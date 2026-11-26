import { Box, Paper, Radio, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { QueryStatePanel } from '../../../components/common/QueryStatePanel';
import { StatusChip } from '../../../components/common/StatusChip';
import { resultCell, type ResultColumn } from '../resultColumns';
import type { Equipment, EquipmentSortKey, SortDirection } from '../../../types/domain';
import { EquipmentImagePreview } from './EquipmentSearchImage';
import { matchesQuickSearch, quickSearchFields } from '../quickSearchFields';
import { runtimeConfig } from '../../../config/runtime';

function Highlight({ text, query }: { text: string; query: string }) {
  if (!matchesQuickSearch(text, query)) return <>{text}</>;
  const literal = Array.from(query).map(char => '\\^$.*+?()[]{}|'.includes(char) ? '\\' + char : char).join('');
  return <>{text.split(new RegExp(`(${literal})`, 'giu')).map((part, index) => index % 2 === 0 ? part :
    <Box key={index} component="mark" sx={{ bgcolor: '#FFE66D', color: '#342A00', borderRadius: 0.25 }}>{part}</Box>)}</>;
}

export function EquipmentSearchResults({ equipment, selectedId, isLoading, isError, refetch, resetFilters, sortKey, sortDirection, changeSort, onSelect, columns, query }: {
  equipment: Equipment[];
  query: string;
  columns: ResultColumn[];
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
  const keyword = query.trim();
  const hiddenFields = quickSearchFields.filter(([key]) => !columns.some(column => column.key === key));
  const showHiddenMatches = hiddenFields.some(([key]) => equipment.some(item => matchesQuickSearch(item[key], keyword)));
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
                  minWidth: 120 + columns.length * 76,
                  '& .MuiTableCell-root': {
                    px: 0.75,
                    maxWidth: 112,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 42 }} />
                    {columns.map((column) => {
                      const key = column.sortKey;
                      const sortable = key && (runtimeConfig.dataSource !== 'api' || key === 'itemNum' || key === 'itemNameKor');
                      return <TableCell key={column.key} sortDirection={sortable && sortKey === key ? sortDirection : false}>
                        {sortable ? <TableSortLabel active={sortKey === key} direction={sortKey === key ? sortDirection : 'asc'}
                          onClick={() => changeSort(key)}>{column.label}</TableSortLabel> : column.label}
                      </TableCell>;
                    })}
                    {showHiddenMatches && <TableCell>일치 항목</TableCell>}
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
                        {columns.map(({ key }) => (
                          <TableCell key={key} title={key === 'image' ? undefined : resultCell(item, key, true)}
                            sx={{ fontWeight: key === 'itemNum' ? 600 : 400 }}>
                            {key === 'image' ? <EquipmentImagePreview equipment={item} /> :
                              key === 'status' ? <StatusChip status={item.status} /> :
                              quickSearchFields.some(([field]) => field === key && matchesQuickSearch(item[field], keyword))
                                ? <Highlight text={resultCell(item, key)} query={keyword} /> : resultCell(item, key)}
                          </TableCell>
                        ))}
                        {showHiddenMatches && <TableCell sx={{ whiteSpace: 'normal' }}>
                          {hiddenFields.filter(([key]) => matchesQuickSearch(item[key], keyword)).map(([key, label]) =>
                            <Box key={key} component="div">{label}: <Highlight text={item[key]!} query={keyword} /></Box>)}
                        </TableCell>}
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
