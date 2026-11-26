-- GSEM v0.9.0 SQL Server read-only data quality checks. Run in SSMS; no writes.
-- A. Different businesses with the same item number are legitimate distinct integrated rows.
SELECT ii.integrated_id,ii.business_id,b.biz_name,i.item_num,COUNT(DISTINCT m.match_id) AS delivery_lines,
       SUM(CASE WHEN m.match_id IS NOT NULL THEN COALESCE(m.[count],0) ELSE 0 END) AS quantity_total
FROM Integrated_Info ii
JOIN Item i ON ii.item_id=i.item_id JOIN Business b ON ii.business_id=b.business_id
LEFT JOIN Contract c ON c.business_id=ii.business_id
LEFT JOIN Sub_Contract sc ON sc.contract_id=c.contract_id
LEFT JOIN Match_Sub_Contract_Item m ON m.item_id=ii.item_id AND m.sub_contract_id=sc.sub_contract_id
WHERE i.item_num='FC-PO-49'
GROUP BY ii.integrated_id,ii.business_id,b.biz_name,i.item_num ORDER BY ii.integrated_id;

-- B. Business + item duplicate integrated rows (investigate, never auto-delete).
SELECT business_id,item_id,COUNT(*) AS duplicate_count
FROM Integrated_Info GROUP BY business_id,item_id HAVING COUNT(*)>1;

-- C. Duplicate contract-line primary identifiers.
SELECT match_id,COUNT(*) AS duplicate_count
FROM Match_Sub_Contract_Item GROUP BY match_id HAVING COUNT(*)>1;

-- D. Missing, negative quantity or missing delivery destination or inverted dates.
SELECT TOP (200) m.match_id,m.item_id,m.sub_contract_id,m.[count],sc.delivery_dest_name,
 m.date_receiving_expect,m.date_receiving,m.date_deliver
FROM Match_Sub_Contract_Item m
LEFT JOIN Sub_Contract sc ON sc.sub_contract_id=m.sub_contract_id
WHERE m.[count] IS NULL OR m.[count]<0
 OR sc.delivery_dest_name IS NULL OR LTRIM(RTRIM(sc.delivery_dest_name))=''
 OR (m.date_receiving IS NOT NULL AND m.date_deliver IS NOT NULL AND m.date_deliver<m.date_receiving)
ORDER BY m.match_id;

-- E. Business/destination contract quantity totals, based on raw match rows.
SELECT c.business_id,sc.delivery_dest_name,COUNT(DISTINCT m.match_id) AS line_count,
 SUM(COALESCE(m.[count],0)) AS quantity_total
FROM Match_Sub_Contract_Item m JOIN Sub_Contract sc ON m.sub_contract_id=sc.sub_contract_id
JOIN Contract c ON sc.contract_id=c.contract_id
GROUP BY c.business_id,sc.delivery_dest_name ORDER BY c.business_id,sc.delivery_dest_name;

-- F. Number of integrated items without linked business-specific contract lines.
SELECT ii.business_id,COUNT(*) AS no_delivery_items
FROM Integrated_Info ii WHERE NOT EXISTS (
 SELECT 1 FROM Contract c JOIN Sub_Contract sc ON c.contract_id=sc.contract_id
 JOIN Match_Sub_Contract_Item m ON m.sub_contract_id=sc.sub_contract_id AND m.item_id=ii.item_id
 WHERE c.business_id=ii.business_id
) GROUP BY ii.business_id ORDER BY ii.business_id;
