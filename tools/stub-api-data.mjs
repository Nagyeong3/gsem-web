const aircraftTypes = {
  a: { code: 'AT001', name: 'A기종' },
  b: { code: 'AT002', name: 'B기종' },
  c: { code: 'AT003', name: 'C기종' },
};

const businesses = {
  a: { businessId: 1, name: '가 사업' },
  b: { businessId: 2, name: '나 사업' },
  c: { businessId: 3, name: '다 사업' },
};

const categories = {
  test: { code: 'CA0001', name: '시험장비' },
  general: { code: 'CA0002', name: '일반공구' },
  special: { code: 'CA0003', name: '특수공구' },
};

const subsystems = {
  drive: { code: 'SS0001', name: '구동계통' },
  power: { code: 'SS0002', name: '동력계통' },
  avionics: { code: 'SS0003', name: '항전계통' },
  electric: { code: 'SS0004', name: '전기계통' },
};

const maintenanceLevels = {
  unit: { code: 'LO0001', name: '부대' },
  field: { code: 'LO0002', name: '야전' },
  depot: { code: 'LO0003', name: '창' },
};

const destinations = {
  a: { destinationId: 1, name: 'A납지' },
  b: { destinationId: 2, name: 'B납지' },
  c: { destinationId: 3, name: 'C납지' },
};

const managers = {
  kim: {
    userId: 1,
    name: '김책임',
    role: 'SUPPORT_EQUIPMENT_MANAGER',
  },
  lee: {
    userId: 2,
    name: '이선임',
    role: 'SUPPORT_EQUIPMENT_MANAGER',
  },
  park: {
    userId: 3,
    name: '박책임',
    role: 'PURCHASING_MANAGER',
  },
};

const statusSequence = ['IN_USE', 'IN_USE', 'REPLACEMENT_REVIEW', 'ON_HOLD'];
const categorySequence = [categories.test, categories.general, categories.special];
const systemSequence = [
  [subsystems.drive, subsystems.electric],
  [subsystems.power],
  [subsystems.avionics, subsystems.electric],
];
const levelSequence = [
  [maintenanceLevels.unit],
  [maintenanceLevels.field],
  [maintenanceLevels.depot],
];
const managerSequence = [[managers.kim, managers.lee], [managers.park], [managers.lee]];
const applicationSequence = [
  [
    [businesses.a, aircraftTypes.a, destinations.a],
    [businesses.b, aircraftTypes.b, destinations.b],
  ],
  [[businesses.a, aircraftTypes.a, destinations.b]],
  [
    [businesses.b, aircraftTypes.b, destinations.c],
    [businesses.c, aircraftTypes.c, destinations.a],
  ],
  [[businesses.a, aircraftTypes.a, destinations.a]],
  [[businesses.c, aircraftTypes.c, destinations.c]],
  [[businesses.b, aircraftTypes.b, destinations.b]],
  [
    [businesses.a, aircraftTypes.a, destinations.a],
    [businesses.c, aircraftTypes.c, destinations.c],
  ],
  [[businesses.a, aircraftTypes.a, destinations.b]],
  [[businesses.c, aircraftTypes.c, destinations.c]],
  [[businesses.b, aircraftTypes.b, destinations.a]],
  [[businesses.a, aircraftTypes.a, destinations.b]],
  [[businesses.c, aircraftTypes.c, destinations.c]],
];

const deliveryStatusSequence = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'];
const dayInMilliseconds = 24 * 60 * 60 * 1_000;
const koreaOffsetInMilliseconds = 9 * 60 * 60 * 1_000;

function toKoreaDate(daysFromToday) {
  return new Date(Date.now() + koreaOffsetInMilliseconds + daysFromToday * dayInMilliseconds)
    .toISOString()
    .slice(0, 10);
}

function uniqueBy(values, key) {
  return [...new Map(values.map((value) => [value[key], value])).values()];
}

function createItem(index) {
  const letter = String.fromCharCode(64 + index);
  const applications = applicationSequence[(index - 1) % applicationSequence.length].map(
    ([business, aircraftType, destination], applicationIndex) => ({
      integratedInfoId: index * 100 + applicationIndex + 1,
      business,
      aircraftType,
      deliveries: [
        {
          deliveryId: index * 1000 + applicationIndex + 1,
          destination: { code: String(destination.destinationId), name: destination.name },
          quantity: 4 + index + applicationIndex,
          deliveryDate: `2026-08-${String(index + applicationIndex + 1).padStart(2, '0')}`,
          ...(deliveryStatusSequence[(index + applicationIndex - 1) % 3] === 'COMPLETED'
            ? {
                receiptDate: `2026-07-${String(index + applicationIndex + 10).padStart(2, '0')}`,
              }
            : {}),
          status: deliveryStatusSequence[(index + applicationIndex - 1) % 3],
        },
      ],
    }),
  );

  return {
    itemId: index,
    itemNumber: `XXXXXX-${String(index).padStart(2, '0')}`,
    itemNameKor: `${letter}장비`,
    itemNameEng: `Equipment ${letter}`,
    itemType: 'SUPPORT_EQUIPMENT',
    category: categorySequence[(index - 1) % categorySequence.length],
    vendor: { vendorId: ((index - 1) % 3) + 1, name: `${letter}업체` },
    aircraftTypes: uniqueBy(
      applications.map((application) => application.aircraftType),
      'code',
    ),
    businesses: uniqueBy(
      applications.map((application) => application.business),
      'businessId',
    ),
    subsystems: systemSequence[(index - 1) % systemSequence.length],
    maintenanceLevels: levelSequence[(index - 1) % levelSequence.length],
    managers: managerSequence[(index - 1) % managerSequence.length],
    destinations: uniqueBy(
      applications.flatMap((application) =>
        application.deliveries.map((delivery) => ({
          destinationId: Number(delivery.destination.code),
          name: delivery.destination.name,
        })),
      ),
      'destinationId',
    ),
    status: statusSequence[(index - 1) % statusSequence.length],
    recentChangeDate: `2026-07-${String(30 - index).padStart(2, '0')}`,
    itemUsageKor: `${letter}장비 점검과 정비 지원에 사용하는 품목`,
    itemUsageEng: `For equipment ${letter} support`,
    calibration: { required: index % 3 === 0 },
    applications,
    replacementSummary: {
      predecessors: index === 1 ? 0 : 1,
      successors: index % 3 === 0 ? 2 : 1,
      hasBranch: index % 3 === 0,
    },
  };
}

export const itemDetails = Array.from({ length: 12 }, (_, index) => createItem(index + 1));

export const filterOptions = {
  itemTypes: [
    { value: 'SUPPORT_EQUIPMENT', label: '지원장비' },
    { value: 'BASIC_ISSUE_ITEM', label: '기본불출품목' },
    { value: 'FLIGHT_GEAR_INSPECTION_EQUIPMENT', label: '조종장구류 점검장비' },
    { value: 'STANDARD', label: '표준기' },
  ],
  aircraftTypes: Object.values(aircraftTypes),
  businesses: Object.values(businesses),
  subsystems: Object.values(subsystems),
  categories: Object.values(categories),
  managers: Object.values(managers).map(({ userId, name }) => ({ userId, name })),
  destinations: Object.values(destinations),
  statuses: [
    { value: 'IN_USE', label: '사용 중' },
    { value: 'REPLACEMENT_REVIEW', label: '대체 검토' },
    { value: 'ON_HOLD', label: '보류' },
  ],
};

export const dashboardOverview = {
  metrics: [
    {
      id: 'ATTENTION',
      label: '확인이 필요한 업무',
      value: 12,
      unit: '건',
      tone: 'BRAND',
      helper: '업무를 확인하고 빠르게 처리해주세요.',
    },
    {
      id: 'REGISTERED',
      label: '전체 등록 품목',
      value: 2346,
      unit: '품목',
      tone: 'NEUTRAL',
      helper: '통합 관리 대상',
    },
    {
      id: 'DELIVERY',
      label: '이번 달 납품 예정',
      value: 84,
      unit: '건',
      tone: 'INFO',
      helper: '프로토타입 목업 기준',
    },
    {
      id: 'DELAY',
      label: '납품 지연',
      value: 3,
      unit: '건',
      tone: 'ERROR',
      helper: '확인 필요',
    },
    {
      id: 'REPLACEMENT',
      label: '단종·대체 검토',
      value: 5,
      unit: '건',
      tone: 'WARNING',
      helper: '검토 필요',
    },
    {
      id: 'APPROVAL',
      label: '변경 승인 대기',
      value: 4,
      unit: '건',
      tone: 'INFO',
      helper: '승인 대기',
    },
  ],
  monthlyDeliveries: Array.from({ length: 12 }, (_, index) => ({
    month: `${index + 1}월`,
    plannedQuantity: 80 + index * 5,
    deliveredQuantity: index < 6 ? 78 + index * 5 : null,
    achievementRate: index < 6 ? 98 : null,
  })),
  recentChanges: itemDetails.slice(0, 4).map((item, index) => ({
    changeId: `CHG-XXXXX-${String(index + 1).padStart(2, '0')}`,
    itemId: item.itemId,
    itemName: item.itemNameKor,
    content: index === 2 ? '구성 변경' : '사양 변경',
    category: index === 2 ? '구성 변경' : '설계 변경',
    requesterName: index % 2 === 0 ? '김책임' : '이선임',
    changedAt: toKoreaDate(-(index + 1)),
    status: index === 2 ? '검토 중' : '완료',
  })),
  upcomingDeliveries: itemDetails.slice(0, 4).map((item, index) => ({
    deliveryId: item.applications[0].deliveries[0].deliveryId,
    itemId: item.itemId,
    itemName: item.itemNameKor,
    itemNumber: item.itemNumber,
    deliveryDate: toKoreaDate(index * 2 + 2),
    daysLeft: index * 2 + 2,
    status: '임박',
  })),
};

export const deliverySchedules = itemDetails.flatMap((item) =>
  item.applications.flatMap((application) =>
    application.deliveries.map((delivery) => ({
      deliveryId: delivery.deliveryId,
      integratedInfoId: application.integratedInfoId,
      item: {
        itemId: item.itemId,
        itemNumber: item.itemNumber,
        itemName: item.itemNameKor,
      },
      business: application.business,
      aircraftType: application.aircraftType,
      destination: delivery.destination,
      plannedQuantity: delivery.quantity,
      orderedQuantity:
        delivery.status === 'PLANNED' ? Math.max(0, delivery.quantity - 2) : delivery.quantity,
      receivedQuantity:
        delivery.status === 'COMPLETED'
          ? delivery.quantity
          : delivery.status === 'IN_PROGRESS'
            ? Math.max(0, delivery.quantity - 3)
            : 0,
      deliveredQuantity: delivery.status === 'COMPLETED' ? delivery.quantity : 0,
      deliveryDate: delivery.deliveryDate,
      ...(delivery.receiptDate ? { receiptDate: delivery.receiptDate } : {}),
      status: delivery.status,
      delayed: false,
      managers: item.managers,
    })),
  ),
);

export const changeEvents = [
  {
    changeId: 'CHG-XXXXX-01',
    item: { itemId: 1, itemNumber: 'XXXXXX-01', itemName: 'A장비' },
    changeType: '담당자 변경',
    requestedBy: managers.kim,
    requestedAt: '2026-07-29T09:20:00+09:00',
    processedBy: managers.lee,
    processedAt: '2026-07-30T14:10:00+09:00',
    status: 'PROCESSED',
    reason: '담당 업무 조정',
    basis: '담당자 확인',
    differences: [
      { field: 'manager', label: '지원장비 담당자', before: '이선임', after: '김책임' },
    ],
  },
  {
    changeId: 'CHG-XXXXX-02',
    item: { itemId: 2, itemNumber: 'XXXXXX-02', itemName: 'B장비' },
    changeType: '품목 정보 변경',
    requestedBy: managers.park,
    requestedAt: '2026-07-28T10:05:00+09:00',
    processedBy: managers.lee,
    status: 'IN_REVIEW',
    reason: '품목 용도 정보 보완',
    basis: '검토 자료 확인',
    differences: [
      { field: 'usage', label: '국문 용도', before: '변경 전 용도', after: '변경 후 용도' },
    ],
  },
  {
    changeId: 'CHG-XXXXX-03',
    item: { itemId: 3, itemNumber: 'XXXXXX-03', itemName: 'C장비' },
    changeType: '대체품 검토',
    requestedBy: managers.lee,
    requestedAt: '2026-07-27T15:30:00+09:00',
    status: 'RECEIVED',
    reason: '단종 여부 확인 후 대체품 검토 필요',
    basis: '단종 확인',
    differences: [
      { field: 'replacement', label: '대체품', before: '미지정', after: '검토 중' },
    ],
  },
  {
    changeId: 'CHG-XXXXX-04',
    item: { itemId: 4, itemNumber: 'XXXXXX-04', itemName: 'D장비' },
    changeType: '장비 구분 변경',
    requestedBy: managers.kim,
    requestedAt: '2026-07-25T11:00:00+09:00',
    processedBy: managers.lee,
    processedAt: '2026-07-26T16:20:00+09:00',
    status: 'PROCESSED',
    reason: '분류 기준 확인',
    basis: '분류 정보 확인',
    differences: [
      { field: 'category', label: '장비 구분', before: '일반공구', after: '특수공구' },
    ],
  },
];

const replacementNodeIds = [1, 2, 6, 3, 7, 4, 8, 9, 5, 10, 11, 12];
const replacementStatuses = [
  'DISCONTINUED', 'DISCONTINUED', 'DISCONTINUED', 'IN_USE',
  'DISCONTINUED', 'DISCONTINUED', 'DISCONTINUED', 'DISCONTINUED',
  'IN_USE', 'REPLACEMENT_PLANNED', 'IN_USE', 'DISCONTINUED',
];
const replacementPairs = [
  [1, 2], [1, 6], [2, 3], [2, 7], [6, 7], [3, 4],
  [3, 8], [7, 9], [4, 5], [4, 10], [8, 11], [9, 12],
];

export const replacementGraph = {
  rootItemId: 1,
  nodes: replacementNodeIds.map((itemId, index) => {
    const item = itemDetails[itemId - 1];
    return {
      itemId,
      itemNumber: item.itemNumber,
      itemName: index === 0 ? 'A장비' : item.itemNameKor,
      businesses: item.businesses.map((business) => business.name),
      status: replacementStatuses[index],
    };
  }),
  edges: replacementPairs.map(([sourceItemId, targetItemId], index) => ({
    relationId: `r${index + 1}`,
    sourceItemId,
    targetItemId,
    changeId: `CHG-${String(index + 1).padStart(5, '0')}`,
    changedAt: `2026-${String(Math.min(index + 1, 9)).padStart(2, '0')}-15`,
    changeType: '단종 대체',
    reason: `${itemDetails[sourceItemId - 1].itemNameKor} 단종에 따른 대체품 적용`,
    requestedBy: managers.kim,
    processedBy: managers.lee,
  })),
};

export function toItemSummary(item) {
  const {
    itemUsageKor: _itemUsageKor,
    itemUsageEng: _itemUsageEng,
    calibration: _calibration,
    applications: _applications,
    replacementSummary: _replacementSummary,
    ...summary
  } = item;
  return summary;
}
