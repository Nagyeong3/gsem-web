import { CalendarMonthOutlined, Check, FitScreen, Search } from '@mui/icons-material';
import {
  Box, Chip, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select,
  TextField, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import {
  Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow,
  type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PageHeader } from '../components/common/PageHeader';
import { replacementHistoryService } from '../services';
import type { ReplacementGraph, ReplacementItem, ReplacementRelation, ReplacementStatus } from '../types/domain';

type HistoryNodeData = ReplacementItem & { selectedPath: boolean } & Record<string, unknown>;
type HistoryNode = Node<HistoryNodeData, 'history'>;

const statusColor: Record<ReplacementStatus, 'success' | 'default' | 'warning'> = {
  '사용 중': 'success', 단종: 'default', '대체 예정': 'warning',
};

function EquipmentNode({ data, selected }: NodeProps<HistoryNode>) {
  const theme = useTheme();
  return <Paper
    variant="outlined"
    sx={{
      width: 172, p: 1.25, borderColor: selected || data.selectedPath ? 'primary.main' : 'divider',
      boxShadow: selected ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.14)}` : 'none',
      transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
      '&:hover': { transform: 'translateY(-1px)', borderColor: 'primary.light' },
    }}
  >
    <Handle type="target" position={Position.Left} style={{ width: 8, height: 8 }} />
    <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{data.itemName}</Typography>
    <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 10.5 }}>{data.itemNum}</Typography>
    <Typography sx={{ mt: 0.65, color: 'text.secondary', fontSize: 10.5, lineHeight: 1.4 }}>
      {data.businesses.join(' · ')}
    </Typography>
    <Chip label={data.status} size="small" color={statusColor[data.status]} variant="outlined" sx={{ mt: 0.75, height: 20, fontSize: 10 }} />
    <Handle type="source" position={Position.Right} style={{ width: 8, height: 8 }} />
  </Paper>;
}

const nodeTypes = { history: EquipmentNode };

function DetailLine({ label, value }: { label: string; value: string }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: '82px 1fr', gap: 1, py: 0.65 }}>
    <Typography sx={{ color: 'text.secondary', fontSize: 11.5 }}>{label}</Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{value}</Typography>
  </Box>;
}

function findConnected(graph: ReplacementGraph, relation?: ReplacementRelation) {
  if (!relation) return new Set<string>();
  const connected = new Set([relation.target]);
  let current = relation.target;
  while (current) {
    const parent = current === relation.target
      ? relation
      : graph.relations.find((item) => item.target === current);
    if (!parent) break;
    connected.add(parent.source);
    current = parent.source;
  }
  return connected;
}

export function ChangeHistoryPage() {
  const theme = useTheme();
  const [graph, setGraph] = useState<ReplacementGraph>({ items: [], relations: [] });
  const [query, setQuery] = useState('');
  const [business, setBusiness] = useState('');
  const [status, setStatus] = useState('');
  const [selectedRelationId, setSelectedRelationId] = useState('r9');

  useEffect(() => { replacementHistoryService.getGraph().then(setGraph); }, []);
  const selectedRelation = graph.relations.find((item) => item.id === selectedRelationId);
  const connected = useMemo(() => findConnected(graph, selectedRelation), [graph, selectedRelation]);
  const visibleIds = useMemo(() => new Set(graph.items.filter((item) =>
    (!query || `${item.itemName} ${item.itemNum}`.toLowerCase().includes(query.toLowerCase())) &&
    (!business || item.businesses.includes(business)) && (!status || item.status === status),
  ).map((item) => item.id)), [business, graph.items, query, status]);

  const nodes: HistoryNode[] = graph.items.map((item) => ({
    id: item.id, type: 'history', position: item.position,
    data: { ...item, selectedPath: connected.has(item.id) },
    hidden: visibleIds.size !== graph.items.length && !visibleIds.has(item.id),
  }));
  const edges: Edge[] = graph.relations.map((item) => {
    const highlighted = item.id === selectedRelationId || (connected.has(item.source) && connected.has(item.target));
    return {
      id: item.id, source: item.source, target: item.target, type: 'smoothstep',
      hidden: visibleIds.size !== graph.items.length && (!visibleIds.has(item.source) || !visibleIds.has(item.target)),
      markerEnd: { type: MarkerType.ArrowClosed, color: highlighted ? theme.palette.primary.main : theme.palette.text.disabled },
      style: { stroke: highlighted ? theme.palette.primary.main : theme.palette.text.disabled, strokeWidth: item.id === selectedRelationId ? 2.5 : 1.4 },
    };
  });

  return <Box sx={{ p: 3, minWidth: 1080, height: 'calc(100vh - 58px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
    <PageHeader title="장비 변경 이력" description="단종품과 대체품의 관계 및 주요 정보 변경 내역을 추적합니다." />
    <Box sx={{ display: 'flex', gap: 1.25, mb: 1.5 }}>
      <TextField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장비명 또는 품번 검색" sx={{ width: 260 }} slotProps={{ htmlInput: { 'aria-label': '변경 이력 검색' }, input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 19, color: 'text.secondary' }} /></InputAdornment> } }} />
      <FormControl size="small" sx={{ width: 150 }}><InputLabel id="history-business-label">사업</InputLabel><Select labelId="history-business-label" label="사업" value={business} onChange={(event) => setBusiness(event.target.value)}><MenuItem value="">전체</MenuItem>{['가 사업', '나 사업', '다 사업'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
      <FormControl size="small" sx={{ width: 150 }}><InputLabel id="history-status-label">상태</InputLabel><Select labelId="history-status-label" label="상태" value={status} onChange={(event) => setStatus(event.target.value)}><MenuItem value="">전체</MenuItem>{['사용 중', '단종', '대체 예정'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
      <Paper variant="outlined" sx={{ ml: 'auto', px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><FitScreen sx={{ fontSize: 18, color: 'text.secondary' }} /><Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>선택 경로가 파란색으로 강조됩니다.</Typography></Paper>
    </Box>

    <Box sx={{ minHeight: 0, flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 326px', gap: 1.5 }}>
      <Paper variant="outlined" sx={{ minWidth: 0, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ position: 'absolute', zIndex: 2, top: 12, left: 16, right: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', pointerEvents: 'none' }}>
          {['1단계 (원본)', '2단계', '3단계', '4단계', '5단계 (현재)'].map((label) => <Typography key={label} sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>{label}</Typography>)}
        </Box>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.55} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} elementsSelectable proOptions={{ hideAttribution: true }} onEdgeClick={(_, edge) => setSelectedRelationId(edge.id)} onNodeClick={(_, node) => { const relation = graph.relations.find((item) => item.target === node.id) ?? graph.relations.find((item) => item.source === node.id); if (relation) setSelectedRelationId(relation.id); }} colorMode={theme.palette.mode}>
          <Background gap={24} size={1} color={theme.palette.divider} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => node.id === selectedRelation?.target ? theme.palette.primary.main : theme.palette.grey[500]} maskColor={alpha(theme.palette.background.default, 0.4)} style={{ width: 150, height: 96, right: 14, bottom: 14, border: `1px solid ${theme.palette.divider}`, borderRadius: 4, background: theme.palette.action.hover }} />
        </ReactFlow>
        <Box sx={{ position: 'absolute', zIndex: 2, left: 96, bottom: 14, display: 'flex', gap: 2, px: 1.25, py: 0.7, bgcolor: alpha(theme.palette.background.paper, 0.94), border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {[['사용 중', 'success.main'], ['단종', 'text.disabled'], ['대체 예정', 'warning.main']].map(([label, color]) => <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} /><Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{label}</Typography></Box>)}
        </Box>
      </Paper>

      <Paper component="aside" aria-label="변경 상세" variant="outlined" sx={{ p: 2, overflow: 'auto' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>변경 상세</Typography>
        {!selectedRelation ? <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 12 }}>연결선을 선택해주세요.</Typography> : <>
          <Box sx={{ mt: 1.5, p: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.07), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2), borderRadius: 1 }}>
            <Typography sx={{ color: 'primary.main', fontSize: 11, fontWeight: 700 }}>{selectedRelation.changeType}</Typography>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{graph.items.find((item) => item.id === selectedRelation.source)?.itemName}</Typography>
              <Typography sx={{ color: 'primary.main', fontSize: 18 }}>→</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{graph.items.find((item) => item.id === selectedRelation.target)?.itemName}</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 1.5, pb: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <DetailLine label="변경번호" value={selectedRelation.changeId} /><DetailLine label="변경일" value={selectedRelation.changedAt} /><DetailLine label="신청자" value={selectedRelation.requester.name} /><DetailLine label="처리자" value={selectedRelation.processor.name} />
          </Box>
          <Typography sx={{ mt: 1.5, fontSize: 12.5, fontWeight: 700 }}>변경 사유</Typography><Typography sx={{ mt: 0.65, color: 'text.secondary', fontSize: 12, lineHeight: 1.6 }}>{selectedRelation.reason}</Typography>
          <Typography sx={{ mt: 1.75, fontSize: 12.5, fontWeight: 700 }}>적용 사업</Typography><Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{graph.items.find((item) => item.id === selectedRelation.target)?.businesses.map((value) => <Chip key={value} label={value} size="small" variant="outlined" />)}</Box>
          <Typography sx={{ mt: 1.75, fontSize: 12.5, fontWeight: 700 }}>처리 과정</Typography>
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.4 }}>{['신청', '검토', '승인', '완료'].map((value) => <Box key={value} sx={{ textAlign: 'center' }}><Box sx={{ mx: 'auto', width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText' }}><Check sx={{ fontSize: 14 }} /></Box><Typography sx={{ mt: 0.5, fontSize: 10.5 }}>{value}</Typography></Box>)}</Box>
          <Box sx={{ mt: 2, p: 1.1, display: 'flex', gap: 1, bgcolor: 'action.hover', borderRadius: 1 }}><CalendarMonthOutlined sx={{ fontSize: 17, color: 'text.secondary' }} /><Typography sx={{ color: 'text.secondary', fontSize: 10.5, lineHeight: 1.5 }}>변경 상태와 처리 과정은 프로토타입 가정이며 조회 기능만 제공합니다.</Typography></Box>
        </>}
      </Paper>
    </Box>
  </Box>;
}
