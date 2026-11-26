# GSEM Equipment Master Frontend Architecture

Route entry: `src/pages/EquipmentMasterPage.tsx`

| Module | Responsibility |
| --- | --- |
| `model.ts` | SQL Server API response types, business/vendor/buyer queries, normalization, grouped delivery mapping, validation indicators, and shared pure utilities |
| `visuals.tsx` | Summary cards, state chips, equipment thumbnail and detail panel |
| `tables.tsx` | Excel-friendly resizable table, optimized view, and filter bar |
| `editor.tsx` | Mock-only editor (disabled in real SQL Server mode) |
| `EquipmentMasterPage.tsx` | Data source mode, query/search/filter/page state, download, and page orchestration |

## Important contracts
- Do not merge rows with the same item number when their business IDs differ. The UI identity is integratedId.
- Business-specific delivery rows are grouped by normalized destination only for display. Individual contract records remain in the detail panel.
- Several dates for one destination are marked as "다건(상세)". Do not silently select the first date.
- The API performs server-side pagination, business/vendor/buyer filtering, and CSV export.
- `VITE_DATA_SOURCE=mock` keeps the Mock editor; `api` remains read-only.
- Column auto-fit checks currently rendered rows, not all pages.
- Image previews require the backend `GSEM_IMAGE_DIR` to contain the referenced image.
- Full TypeScript type-check and browser regression testing must be done in the development server before promoting any build.

## Closed-network smoke tests
1. `npm run build`
2. Search FC-PO-49; verify business-specific rows remain distinct.
3. Change page size 20 / 50 / 100 and navigate pages.
4. Test vendor, buyer and business filters together.
5. Resize columns and double-click right header border for auto-fit.
6. Select a row and confirm the selected detail, without list-scroll reset.
7. Download filtered CSV and verify values / Korean text in Excel.
8. Confirm Dashboard and Equipment Search are unchanged.
