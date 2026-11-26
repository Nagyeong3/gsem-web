# ERD 필드와 API 필드 매핑 초안

이 문서는 실제 DB 변환 규칙이 아니라 현재 사진과 설명을 바탕으로 한 연결 초안이다. DB 담당자가 최종 ERD를 확정하면 키·Null·유일성·코드값을 다시 검증한다.

| ERD 테이블·필드 | API 필드 | 변환 기준 | 상태 |
|---|---|---|---|
| `Item.item_id` | `itemId` | 정수 식별자 | 부분 확정 |
| `Item.item_num` | `itemNumber` | 품번, 검색 결과의 품목 식별 표시 | 확정 |
| `Item.item_name_kor` | `itemNameKor` | 국문 품명 | 부분 확정 |
| `Item.item_name_eng` | `itemNameEng` | 영문 품명 | 부분 확정 |
| `Item.item_usage_kor` | `itemUsageKor` | 국문 용도 | 부분 확정 |
| `Item.item_usage_eng` | `itemUsageEng` | 영문 용도 | 부분 확정 |
| `Item.code_CATEG` | `category.code` | `CATEG` 공통코드, 장비 구분 | 확정 |
| `Item.bender_id` | `vendor.vendorId` | 현재 ERD 표기를 유지하되 명칭 오타 여부 확인 | 부분 확정 |
| `Bender.bender_name` | `vendor.name` | 일반화된 제조사·구매처명 | 부분 확정 |
| `Integrated_Info.integrated_id` | 내부 조합키 | 프론트에 직접 노출하지 않음 | 부분 확정 |
| `Integrated_Info.item_id` | `itemId` | 품목 연결 | 부분 확정 |
| `Integrated_Info.business_id` | `businesses[].businessId` | 한 품목의 복수 사업을 배열로 집계 | 부분 확정 |
| `Business.biz_name` | `businesses[].name` | 사업명 | 부분 확정 |
| `Business.code_ATYPE` | `aircraftTypes[].code` | `ATYPE` 공통코드 | 부분 확정 |
| `Match_Item_SubSystem.code_SSYST` | `subsystems[].code` | 품목별 복수 `SSYST` 코드 | 확정 |
| `Match_Item_LevelOfMaintenance.code_LOM` | `maintenanceLevels[].code` | 품목별 복수 정비계단 | 확정 |
| `Match_Managing_User.user_id` | `managers[].userId` | 품목 담당자, 복수 가능성 고려 | 부분 확정 |
| `Match_Managing_User.role` | `managers[].role` | 지원장비·구매 담당자, 현재 Null 가능 | 부분 확정 |
| `Contract_Delivery.delivery_id` | `deliveryId` | 납품 일정 식별자 | 부분 확정 |
| `Contract_Delivery.delivery_dest_id` | `destination.destinationId` | 납지 연결 | 부분 확정 |
| `Contract_Delivery.quantity` | `plannedQuantity` | 실제 수량 의미 재확인 필요 | 미확정 |
| `Contract_Delivery.delivery_month` | `deliveryDate` | `YYYY-MM-DD` 날짜 | 확정 |
| `Contract_Delivery.receipt_month` | `receiptDate` | `YYYY-MM-DD` 날짜 | 확정 |
| `Contract_Delivery.delivery_status` | `status` | 예정·진행·완료 임시 매핑 | 프로토타입 가정 |
| `Delivery_Destination.delivery_dest_name` | `destination.name` | 납지명 | 부분 확정 |

## 집계 원칙

- API 품목 목록은 `Item` 하나당 한 행을 반환한다.
- 복수 사업·기종·계통·정비계단·납지·담당자는 배열로 반환한다.
- `Integrated_Info`는 DB 조인 기준이며 화면의 독립 품목으로 취급하지 않는다.
- 담당자는 품목 단위라는 업무 규칙을 우선한다. 현재 물리 ERD가 사업 연계정보별 행을 요구하면 백엔드에서 중복 제거한다.

## 미확정 데이터

- 지원장비·기본불출품목·조종장구류 점검장비·표준기를 구분하는 저장 필드
- 담당자 정·부 구분 필드와 우선순위
- 품보 형태, 교정, SERD의 최종 테이블·키
- 단종·대체 관계와 사업별 유효기간의 실제 테이블
- `quantity`와 발주·입고·납품 수량의 최종 분리 방식

