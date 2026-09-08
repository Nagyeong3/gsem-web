# V8 DB 반영 작업 메모

## 확정된 SQL Server 접속 기준

- DBMS: SQL Server
- 접속 도구: SQL Server Management Studio 19
- Host: `166.103.117.105`
- Port: `1433`
- Database: `GSEMS`
- Driver: `ODBC Driver 17 for SQL Server`
- 인증 방식: SQL Server 계정/비밀번호 방식

실제 계정과 비밀번호는 `.env`에만 작성하고 Git 저장소에 커밋하지 않는다.

## V8 릴리즈 범위

V8은 전체 기능의 완전한 DB 전환이 아니라, V7 프로토타입을 유지하면서 첫 실제 SQL Server 조회를 붙이는 기준본이다.

### V8 포함

1. `GSEM_DATA_SOURCE=sqlserver`일 때 FastAPI가 SQL Server Repository를 선택한다.
2. `/api/v1/items` 목록을 실제 DB 기준으로 조회한다.
3. 장비 목록은 `Integrated_Info`를 기준으로 `Item`, `Business`, `Vendor`를 조인한다.
4. `contract_id`, `serd_info_id`, `code_ICS`처럼 NULL 가능한 값은 오류 없이 내려준다.
5. 코드명 변환, 납품, 이력, 변경 신청, 대체품 계보는 아직 Mock 또는 미연결 표시를 유지한다.
6. `/health`에서 `dataSource=sqlserver`와 DB 접속 상태를 확인할 수 있다.

### V8 제외

1. 변경 신청/승인/반려 실제 DB 저장
2. 대체품 계보 실제 DB화
3. History 화면 완전 DB 연동
4. Delivery 일정/날짜 기반 화면 완전 DB 연동
5. `Common_Code_Detail` 기반 코드명 전체 변환
6. 문서 업로드/checksum 처리

## V8 반영 원칙

1. `Integrated_Info`를 장비 조회의 중심 기준으로 본다.
2. 실제 ERD에서 확인된 테이블부터 SQL Server 연동 대상으로 삼는다.
3. DB 구조가 미완성인 영역은 무리해서 연결하지 않고 V7 Mock 데이터를 유지한다.
4. Mock 유지 영역은 화면/응답에서 더미 데이터임을 알 수 있도록 `dataNotice`, `dataSourceLabel`, `dataSourceReason` 같은 메타 정보를 붙인다.

## `/api/v1/items` 1차 SQL Server 연동

현재 구현 범위는 아래 테이블 조인까지다.

```sql
FROM Integrated_Info ii
LEFT JOIN Item i
    ON ii.item_id = i.item_id
LEFT JOIN Business b
    ON ii.business_id = b.business_id
LEFT JOIN Vendor v
    ON i.vendor_id = v.vendor_id
```

### 확인된 매핑

| 응답 필드 | DB 기준 |
| --- | --- |
| `itemId` | `Integrated_Info.integrated_id` |
| `integratedId` | `Integrated_Info.integrated_id` |
| `sourceItemId` | `Item.item_id` |
| `itemNumber` | `Item.item_num` |
| `itemNsn` | `Item.item_nsn` |
| `itemNameKor` | `Item.item_name_kor` |
| `itemNameEng` | `Item.item_name_eng` |
| `itemNameNormal` | `Item.item_name_normal` |
| `itemUsageKor` | `Item.item_usage_kor` |
| `itemUsageEng` | `Item.item_usage_eng` |
| `category.code` | `Item.code_CATEG` |
| `itemType` | `Item.code_ICS`, NULL이면 `UNASSIGNED` |
| `businesses[0].businessId` | `Business.business_id` |
| `businesses[0].name` | `Business.biz_name` |
| `aircraftTypes[0].code` | `Business.code_ATYPE` |
| `vendor.vendorId` | `Item.vendor_id` |
| `vendor.name` | `Vendor.vendor_name` |
| `contractId` | `Integrated_Info.contract_id` |
| `serdInfoId` | `Item.serd_info_id` |
| `createdAt` | `Integrated_Info.created_at` |

## 우선 DB 연동 후보

- `Item`
- `Business`
- `Contract`
- `Integrated_Info`
- `Vendor`
- `SERD_Info`
- `Delivery`
- `Delivery_Destination`
- `Users`
- `Common_Code_Group`
- `Common_Code_Detail`
- `Match_Item_Subsystem`
- `Match_Item_LevelOfMaintenace`

## 후순위 또는 Mock 유지 대상

- 변경 신청/승인/반려 프로세스
- 대체품 계보
- 문서 업로드/다운로드/체크섬 검증
- 담당자 정/부 구조의 정확한 DB 연동
- 납품일 기반 일정 화면

## 현재 확인된 ERD 메모

### Integrated_Info

- `integrated_id`
- `created_at`
- `item_id` FK, NULL 허용
- `business_id` FK, NULL 허용
- `contract_id` FK, NULL 허용
- `unique(item_id, business_id)`
- 동일사업 동일제품 중복 방지 목적

### Item

- 품번 기준 기본 정보 테이블
- `item_id`
- `item_num`
- `item_nsn`
- `item_name_normal`
- `item_name_kor`
- `item_name_eng`
- `item_usage_kor`
- `item_usage_eng`
- `vendor_id`는 `Vendor` 직접 FK
- `serd_info_id`는 `SERD_Info` 직접 FK
- `code_CATEG`: 장비 구분, 예: 일반공구, 특수공구, 시험장비
- `code_ICS`: 품목 구분, 예: 지원장비(SE), 기본불출품목(BII), 표준기(SI)

### Business

- `business_id`
- `biz_name`
- `code_ATYPE`

### Vendor

- `vendor_id`
- `vendor_name`

### Delivery

- `delivery_id`
- `integrated_id`
- `delivery_dest_id`
- `quantity` NOT NULL
- `delivery_status varchar(20)`
- 납품 예정일/실제 납품일 필드는 현재 ERD에 없음

### Delivery_Destination

예시:

| delivery_dest_id | delivery_dest_name |
| --- | --- |
| 1 | 508 항공대대 |

### Contract

- `contract_id`: 계약번호 역할
- `unit`: 수량 단위, 예: ea/set
- `price`: 금액

### History

현재 ERD 기준 `History`는 종합이력 로그 수준이다. 변경 신청/승인/반려와 대체품 계보를 안정적으로 표현하기에는 부족하므로 V8에서는 DB 연동하지 않는다.

```dbml
Table History {
  history_id int [pk, increment]
  integrated_id int [ref: > Integrated_Info.integrated_id, note: "통합정보 기준으로 이력관리"]
  created_at datetime [default: `now()`, note: "생성일시"]
  user_id int [ref: > Users.user_id, note: "작성자"]
  history_type varchar(50)
  history_detail varchar(500) [not null]

  note: "종합이력"
}
```

### Document

`document_checksum byte(256)`의 의도가 불명확하므로 문서 기능은 후순위로 둔다.
