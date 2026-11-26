import type { EquipmentSearchRequest } from '../../types/domain';
import type { EquipmentService } from '../../services/equipmentService';
import { resultCell, resultColumns, type ResultColumn } from './resultColumns';

const encoder = new TextEncoder();
const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const officeRelations = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelations = 'http://schemas.openxmlformats.org/package/2006/relationships';

function xmlText(value: string) {
  return Array.from(value).filter(character => {
    const point = character.codePointAt(0)!;
    return point === 9 || point === 10 || point === 13 ||
      (point >= 32 && !(point >= 0xd800 && point <= 0xdfff) && point !== 0xfffe && point !== 0xffff);
  }).join('').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function worksheet(rows: string[][], filter = false) {
  const lastColumn = String.fromCharCode(64 + rows[0].length);
  const view = filter
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';
  const columns = `<cols><col min="1" max="${rows[0].length}" width="${filter ? 23 : 32}" customWidth="1"/></cols>`;
  const data = rows.map((row, index) => `<row r="${index + 1}">${row.map((value, column) =>
    `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"${index === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlText(value.slice(0, 32767))}</t></is></c>`).join('')}</row>`).join('');
  return `${xmlHeader}<worksheet xmlns="${spreadsheet}">${view}${columns}<sheetData>${data}</sheetData>${filter
    ? `<autoFilter ref="A1:${lastColumn}${rows.length}"/>` : ''}</worksheet>`;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function zipFiles(files: Record<string, string>) {
  const chunks: ArrayBuffer[] = [];
  const directory: ArrayBuffer[] = [];
  let offset = 0;
  let directorySize = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    let crc = 0xffffffff;
    for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    crc = (crc ^ 0xffffffff) >>> 0;

    const local = new Uint8Array(30 + name.length);
    const a = new DataView(local.buffer);
    a.setUint32(0, 0x04034b50, true);
    a.setUint16(4, 20, true);
    a.setUint16(12, 33, true);
    a.setUint32(14, crc, true);
    a.setUint32(18, data.length, true);
    a.setUint32(22, data.length, true);
    a.setUint16(26, name.length, true);
    local.set(name, 30);

    const entry = new Uint8Array(46 + name.length);
    const b = new DataView(entry.buffer);
    b.setUint32(0, 0x02014b50, true);
    b.setUint16(4, 20, true);
    b.setUint16(6, 20, true);
    b.setUint16(14, 33, true);
    b.setUint32(16, crc, true);
    b.setUint32(20, data.length, true);
    b.setUint32(24, data.length, true);
    b.setUint16(28, name.length, true);
    b.setUint32(42, offset, true);
    entry.set(name, 46);

    chunks.push(local.buffer, data.buffer);
    directory.push(entry.buffer);
    offset += local.length + data.length;
    directorySize += entry.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, directory.length, true);
  end.setUint16(10, directory.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function createEquipmentWorkbook(rows: string[][], metadata: string[][]) {
  return zipFiles({
    '[Content_Types].xml': `${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
      <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    </Types>`,
    '_rels/.rels': `${xmlHeader}<Relationships xmlns="${packageRelations}"><Relationship Id="rId1" Type="${officeRelations}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${xmlHeader}<workbook xmlns="${spreadsheet}" xmlns:r="${officeRelations}"><bookViews><workbookView/></bookViews><sheets>
      <sheet name="검색 결과" sheetId="1" r:id="rId1"/><sheet name="추출 정보" sheetId="2" r:id="rId2"/>
    </sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${xmlHeader}<Relationships xmlns="${packageRelations}">
      <Relationship Id="rId1" Type="${officeRelations}/worksheet" Target="worksheets/sheet1.xml"/>
      <Relationship Id="rId2" Type="${officeRelations}/worksheet" Target="worksheets/sheet2.xml"/>
      <Relationship Id="rId3" Type="${officeRelations}/styles" Target="styles.xml"/>
    </Relationships>`,
    'xl/styles.xml': `${xmlHeader}<styleSheet xmlns="${spreadsheet}">
      <fonts count="2"><font/><font><b/><color rgb="FFFFFFFF"/></font></fonts>
      <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173A62"/><bgColor indexed="64"/></patternFill></fill></fills>
      <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`,
    'xl/worksheets/sheet1.xml': worksheet(rows, true),
    'xl/worksheets/sheet2.xml': worksheet(metadata),
  });
}

function extractionStamp(date: Date) {
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const part = Object.fromEntries(format.formatToParts(date).map(entry => [entry.type, entry.value]));
  return {
    filename: `${part.year}${part.month}${part.day}_${part.hour}${part.minute}${part.second}_KST`,
    display: `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second} KST`,
  };
}

export async function exportEquipment(
  service: Pick<EquipmentService, 'search'>,
  request: Omit<EquipmentSearchRequest, 'page' | 'size'>,
  columns: ResultColumn[],
  exporter: string,
  onProgress: (done: number, total: number) => void,
) {
  const exportColumns = columns.filter(column => column.key !== 'image');
  if (!exportColumns.some(column => column.key === 'manager')) {
    exportColumns.push(resultColumns.find(column => column.key === 'manager')!);
  }
  const rows = [exportColumns.map(column => column.label)];
  const ids = new Set<number>();
  let expected = 0;
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const result = await service.search({ ...request, page, size: 100 });
    if (page === 1) {
      expected = result.totalElements;
      totalPages = result.totalPages;
      if (expected === 0) throw new Error('내보낼 검색 결과가 없습니다.');
      if (expected > 1_048_575) throw new Error('엑셀 행 한도를 초과했습니다. 검색 범위를 좁혀 주세요.');
    }
    if (result.totalElements !== expected || result.page !== page) throw new Error('조회 건수가 변경되었습니다. 다시 내보내 주세요.');
    for (const item of result.items) {
      if (ids.has(item.itemId)) throw new Error('조회 중 검색 결과 순서가 바뀌었습니다. 다시 내보내 주세요.');
      ids.add(item.itemId);
      rows.push(exportColumns.map(column => resultCell(item, column.key, true)));
    }
    onProgress(ids.size, expected);
  }
  if (ids.size !== expected) throw new Error('일부 검색 결과를 가져오지 못했습니다. 다시 내보내 주세요.');
  const stamp = extractionStamp(new Date());
  const safeName = Array.from(exporter).filter(character => character.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '') || '담당자';
  const blob = createEquipmentWorkbook(rows, [
    ['항목', '값'], ['추출 담당자', exporter], ['추출 일시', stamp.display], ['추출 건수', String(ids.size)],
  ]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `장비검색_${safeName}_${stamp.filename}.xlsx`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
