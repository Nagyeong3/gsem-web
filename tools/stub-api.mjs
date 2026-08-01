import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  dashboardOverview,
  changeEvents,
  deliverySchedules,
  filterOptions,
  itemDetails,
  replacementGraph,
  toItemSummary,
} from './stub-api-data.mjs';

const apiPrefix = '/api/v1';
const allowedSortFields = new Set([
  'itemNumber',
  'itemNameKor',
  'aircraftType',
  'business',
  'subsystem',
  'category',
  'manager',
  'destination',
  'status',
  'recentChangeDate',
]);

function getGeneratedAt() {
  return new Date().toISOString();
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ]);
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
}

function sendJson(request, response, status, body) {
  setCorsHeaders(request, response);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function sendError(request, response, status, code, message, fieldErrors) {
  sendJson(request, response, status, {
    error: {
      code,
      message,
      ...(fieldErrors?.length ? { fieldErrors } : {}),
      traceId: 'stub-trace',
    },
  });
}

function parsePositiveInteger(value, fallback) {
  if (value === null) return { value: fallback };
  if (!/^\d+$/.test(value)) return { error: '양의 정수여야 합니다.' };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return { error: '1 이상이어야 합니다.' };
  return { value: parsed };
}

function includesCode(values, code) {
  return values.some((value) => value.code === code);
}

function matchesFilters(item, searchParams) {
  const query = searchParams.get('query')?.trim().toLocaleLowerCase('ko-KR');
  const searchableText = [
    item.itemNumber,
    item.itemNameKor,
    item.itemNameEng,
    item.itemUsageKor,
    item.itemUsageEng,
  ]
    .join(' ')
    .toLocaleLowerCase('ko-KR');

  return (
    (!query || searchableText.includes(query)) &&
    (!searchParams.get('itemType') || item.itemType === searchParams.get('itemType')) &&
    (!searchParams.get('aircraftTypeCode') ||
      includesCode(item.aircraftTypes, searchParams.get('aircraftTypeCode'))) &&
    (!searchParams.get('businessId') ||
      item.businesses.some(
        (business) => business.businessId === Number(searchParams.get('businessId')),
      )) &&
    (!searchParams.get('subsystemCode') ||
      includesCode(item.subsystems, searchParams.get('subsystemCode'))) &&
    (!searchParams.get('categoryCode') || item.category.code === searchParams.get('categoryCode')) &&
    (!searchParams.get('managerUserId') ||
      item.managers.some(
        (manager) => manager.userId === Number(searchParams.get('managerUserId')),
      )) &&
    (!searchParams.get('destinationId') ||
      item.destinations.some(
        (destination) =>
          destination.destinationId === Number(searchParams.get('destinationId')),
      )) &&
    (!searchParams.get('status') || item.status === searchParams.get('status'))
  );
}

function getSortValue(item, field) {
  const values = {
    itemNumber: item.itemNumber,
    itemNameKor: item.itemNameKor,
    aircraftType: item.aircraftTypes[0]?.name ?? '',
    business: item.businesses[0]?.name ?? '',
    subsystem: item.subsystems[0]?.name ?? '',
    category: item.category.name,
    manager: item.managers[0]?.name ?? '',
    destination: item.destinations[0]?.name ?? '',
    status: item.status,
    recentChangeDate: item.recentChangeDate ?? '',
  };
  return values[field];
}

function handleItemSearch(request, response, url) {
  const pageResult = parsePositiveInteger(url.searchParams.get('page'), 1);
  const sizeResult = parsePositiveInteger(url.searchParams.get('size'), 20);
  const fieldErrors = [];

  if (pageResult.error) fieldErrors.push({ field: 'page', reason: pageResult.error });
  if (sizeResult.error || sizeResult.value > 100) {
    fieldErrors.push({ field: 'size', reason: '1 이상 100 이하여야 합니다.' });
  }

  const [sortField, sortDirection, ...extraSortParts] = (
    url.searchParams.get('sort') ?? 'recentChangeDate,desc'
  ).split(',');
  if (
    extraSortParts.length > 0 ||
    !allowedSortFields.has(sortField) ||
    !['asc', 'desc'].includes(sortDirection)
  ) {
    fieldErrors.push({ field: 'sort', reason: '지원하는 정렬 형식을 사용해야 합니다.' });
  }

  if (fieldErrors.length > 0) {
    sendError(request, response, 400, 'INVALID_REQUEST', '요청 조건을 확인해주세요.', fieldErrors);
    return;
  }

  const filtered = itemDetails.filter((item) => matchesFilters(item, url.searchParams));
  filtered.sort((left, right) => {
    const comparison = String(getSortValue(left, sortField)).localeCompare(
      String(getSortValue(right, sortField)),
      'ko',
    );
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const page = pageResult.value;
  const size = sizeResult.value;
  const totalElements = filtered.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const start = (page - 1) * size;

  sendJson(request, response, 200, {
    data: filtered.slice(start, start + size).map(toItemSummary),
    page: { page, size, totalElements, totalPages },
    meta: { generatedAt: getGeneratedAt() },
  });
}

function getPageRequest(url) {
  const pageResult = parsePositiveInteger(url.searchParams.get('page'), 1);
  const sizeResult = parsePositiveInteger(url.searchParams.get('size'), 20);
  const fieldErrors = [];
  if (pageResult.error) fieldErrors.push({ field: 'page', reason: pageResult.error });
  if (sizeResult.error || sizeResult.value > 100) {
    fieldErrors.push({ field: 'size', reason: '1 이상 100 이하여야 합니다.' });
  }
  return { pageResult, sizeResult, fieldErrors };
}

function sendPage(request, response, values, page, size) {
  const totalElements = values.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const start = (page - 1) * size;
  sendJson(request, response, 200, {
    data: values.slice(start, start + size),
    page: { page, size, totalElements, totalPages },
    meta: { generatedAt: getGeneratedAt() },
  });
}

function handleDeliverySearch(request, response, url) {
  const { pageResult, sizeResult, fieldErrors } = getPageRequest(url);
  if (fieldErrors.length > 0) {
    sendError(request, response, 400, 'INVALID_REQUEST', '요청 조건을 확인해주세요.', fieldErrors);
    return;
  }
  const query = url.searchParams.get('query')?.trim().toLocaleLowerCase('ko-KR');
  const filtered = deliverySchedules.filter((delivery) => {
    const searchable = [
      delivery.item.itemNumber,
      delivery.item.itemName,
      delivery.business.name,
      delivery.destination.name,
    ].join(' ').toLocaleLowerCase('ko-KR');
    return (
      (!query || searchable.includes(query)) &&
      (!url.searchParams.get('businessId') ||
        delivery.business.businessId === Number(url.searchParams.get('businessId'))) &&
      (!url.searchParams.get('aircraftTypeCode') ||
        delivery.aircraftType.code === url.searchParams.get('aircraftTypeCode')) &&
      (!url.searchParams.get('destinationId') ||
        Number(delivery.destination.code) === Number(url.searchParams.get('destinationId'))) &&
      (!url.searchParams.get('status') || delivery.status === url.searchParams.get('status'))
    );
  });
  sendPage(request, response, filtered, pageResult.value, sizeResult.value);
}

function handleChangeEventSearch(request, response, url) {
  const { pageResult, sizeResult, fieldErrors } = getPageRequest(url);
  if (fieldErrors.length > 0) {
    sendError(request, response, 400, 'INVALID_REQUEST', '요청 조건을 확인해주세요.', fieldErrors);
    return;
  }
  const query = url.searchParams.get('query')?.trim().toLocaleLowerCase('ko-KR');
  const filtered = changeEvents.filter((event) => {
    const searchable = [
      event.changeId,
      event.item.itemNumber,
      event.item.itemName,
      event.changeType,
    ].join(' ').toLocaleLowerCase('ko-KR');
    return (
      (!query || searchable.includes(query)) &&
      (!url.searchParams.get('itemId') ||
        event.item.itemId === Number(url.searchParams.get('itemId'))) &&
      (!url.searchParams.get('changeType') ||
        event.changeType === url.searchParams.get('changeType')) &&
      (!url.searchParams.get('status') || event.status === url.searchParams.get('status')) &&
      (!url.searchParams.get('requesterUserId') ||
        event.requestedBy.userId === Number(url.searchParams.get('requesterUserId')))
    );
  });
  sendPage(request, response, filtered, pageResult.value, sizeResult.value);
}

function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    setCorsHeaders(request, response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendError(request, response, 405, 'METHOD_NOT_ALLOWED', '지원하지 않는 요청 방식입니다.');
    return;
  }

  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/health') {
    sendJson(request, response, 200, { status: 'ok', dataSource: 'stub' });
    return;
  }
  if (url.pathname === `${apiPrefix}/dashboard/overview`) {
    sendJson(request, response, 200, {
      data: dashboardOverview,
      meta: { generatedAt: getGeneratedAt() },
    });
    return;
  }
  if (url.pathname === `${apiPrefix}/items/filter-options`) {
    sendJson(request, response, 200, {
      data: filterOptions,
      meta: { generatedAt: getGeneratedAt() },
    });
    return;
  }
  if (url.pathname === `${apiPrefix}/items`) {
    handleItemSearch(request, response, url);
    return;
  }
  if (url.pathname === `${apiPrefix}/deliveries`) {
    handleDeliverySearch(request, response, url);
    return;
  }
  if (url.pathname === `${apiPrefix}/change-events`) {
    handleChangeEventSearch(request, response, url);
    return;
  }

  const graphMatch = url.pathname.match(/^\/api\/v1\/items\/(\d+)\/replacement-graph$/);
  if (graphMatch) {
    if (Number(graphMatch[1]) !== replacementGraph.rootItemId) {
      sendError(request, response, 404, 'ITEM_NOT_FOUND', '요청한 품목이 없습니다.');
      return;
    }
    sendJson(request, response, 200, {
      data: replacementGraph,
      meta: { generatedAt: getGeneratedAt() },
    });
    return;
  }

  const itemMatch = url.pathname.match(/^\/api\/v1\/items\/(\d+)$/);
  if (itemMatch) {
    const item = itemDetails.find((candidate) => candidate.itemId === Number(itemMatch[1]));
    if (!item) {
      sendError(request, response, 404, 'ITEM_NOT_FOUND', '요청한 품목이 없습니다.');
      return;
    }
    sendJson(request, response, 200, {
      data: item,
      meta: { generatedAt: getGeneratedAt() },
    });
    return;
  }

  sendError(request, response, 404, 'NOT_FOUND', '요청한 경로가 없습니다.');
}

export function createStubApiServer() {
  return createServer((request, response) => {
    try {
      handleRequest(request, response);
    } catch {
      sendError(request, response, 500, 'INTERNAL_ERROR', 'Stub API 처리 중 오류가 발생했습니다.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.STUB_API_PORT ?? 4010);
  const server = createStubApiServer();
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`GSEM Stub API: http://127.0.0.1:${port}\n`);
  });
}
