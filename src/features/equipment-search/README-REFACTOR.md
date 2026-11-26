# Equipment Search refactoring (2026-10-21)

The page is organized by responsibility:

- `src/pages/EquipmentSearchPage.tsx`: URL-backed filters, stable Korean IME input, selected row identity, query state, pagination, and composition.
- `components/EquipmentSearchFilters.tsx`: filter selectors and active filter chips.
- `components/EquipmentSearchResults.tsx`: search-result grid and keyboard row selection.
- `components/EquipmentSearchDetail.tsx`: selected equipment's detail sidebar.
- `components/EquipmentSearchImage.tsx`: thumbnail and hover-only large preview.
- `searchConfig.ts`: sortable column definitions and page-size defaults.
- `equipmentSearch.ts` (existing): shared display and formatting helpers; left unchanged.

## Contracts to preserve

1. Do not update URL `q` per keystroke; Korean IME composition must stay in local `searchInput` until Search/Enter.
2. Do not put `selectedId` back into URL query updates; row selections must not refetch/reset scroll.
3. Leave page size options `20/50/100` and keep original sort/filter URL behavior.
4. Keep image enlargement tied to thumbnail hover, not row hover.
5. `npm run build`, browser smoke tests and the previous EquipmentMaster refactor must all pass before production.

`node tools/check-equipment-search-refactor.mjs` performs dependency-free static guards; it is not a substitute for browser or build tests.
