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

## V8 반영 원칙

1. `Integrated_Info`를 장비 조회의 중심 기준으로 본다.
2. 실제 ERD에서 확인된 테이블부터 SQL Server 연동 대상으로 삼는다.
3. DB 구조가 미완성인 영역은 무리해서 연결하지 않고 V7 Mock 데이터를 유지한다.
4. Mock 유지 영역은 화면/응답에서 더미 데이터임을 알 수 있도록 `dataNotice`, `dataSourceLabel`, `dataSourceReason` 같은 메타 정보를 붙인다.

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
- `vendor_id`는 `Vendor` 직접 FK
- `serd_info_id`는 `SERD_Info` 직접 FK
- `code_CATEG`: 장비 구분, 예: 일반공구, 특수공구, 시험장비
- `code_ICS`: 품목 구분, 예: 지원장비(SE), 기본불출품목(BII), 표준기(SI)

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
