# AGENTS.md

## 1. Project purpose

This repository contains the prototype and future implementation of a support-equipment management system for enterprise users.

The current phase is requirements discovery and interactive UI prototyping. The database schema, backend framework, API contract, authentication model, and detailed business rules are not final.

Do not treat provisional mock fields or relationships as confirmed production requirements.

## 2. Current source of truth

Use the following files as the primary visual references:

- `docs/mockups/dashboard.png`
- `docs/mockups/equipment-search.png`
- `docs/mockups/change-history.png`

Do not edit, regenerate, crop, or overwrite the reference images unless the user explicitly requests it.

When requirements conflict, follow this order:

1. The user's latest explicit instruction
2. Repository specifications and decision records
3. This `AGENTS.md`
4. Existing implementation
5. Reasonable assumptions

If a business rule is uncertain, record it as an open question instead of silently deciding it.

## 3. Scope of the first prototype

The initial interactive prototype contains three primary screens:

1. Main dashboard
2. Equipment search
3. Equipment change history

The prototype must use mock data and must not depend on a finalized database or production backend.

Build reusable application structure, shared components, interaction states, and a replaceable data-access layer. Avoid implementing production CRUD, authentication, authorization, or database migrations until explicitly requested.

## 4. Frontend direction

Unless the user approves a different choice, use:

- React
- TypeScript
- Vite
- MUI Core
- MUI Icons or Lucide icons
- A node-based graph library such as React Flow for the replacement-history tree

Use stable package versions and pin them in the lockfile. Do not introduce paid MUI X features without confirming licensing.

Preferred source organization:

```text
src/
├── app/
├── pages/
├── features/
├── components/
├── services/
├── mocks/
├── theme/
├── types/
└── utils/
```

Pages and UI components must not import mock JSON directly. Use this dependency direction:

```text
Page or component
→ query hook
→ service interface
→ mock adapter now / real API adapter later
```

Keep backend DTOs, frontend view models, and database entities conceptually separate.

## 5. Design and UX rules

The target is a modern 2026 enterprise product with clear information hierarchy and high usability. Avoid the appearance of a legacy manufacturing ERP or generic AI-generated admin template.

Mandatory rules:

- No emoji in the interface or source data
- Use only official MUI Icons or Lucide-style icons
- No decorative Chinese characters, Japanese characters, broken Korean glyphs, or unexplained foreign text
- No excessive gradients, glassmorphism, oversized shadows, or unnecessarily rounded cards
- No meaningless charts or decorative metrics
- Keep typography, spacing, frame dimensions, colors, borders, and interaction patterns consistent across all screens
- Korean text must render clearly with an appropriate Korean font stack
- Treat 1440×900 as the primary desktop design baseline while preserving the proportions of the reference mockups
- Implement loading, empty, error, selected, disabled, and modal/drawer states when relevant
- Preserve keyboard accessibility, visible focus states, semantic labels, and sufficient color contrast

Use design tokens for colors, typography, spacing, radius, shadows, and component heights. Do not scatter arbitrary pixel values across page files.

## 6. Fixed prototype conventions

The following values are intentional prototype conventions:

- Logged-in user: `김책임`
- Employee ranks: `책임` and `선임` only
- Do not use employee ranks such as `사원`, `대리`, or `과장`
- Do not include the sidebar menu item `기준정보 관리`
- Use placeholders such as `XXXXXX`, `A장비`, `B장비`, `가 사업`, `나 사업`, and `다 사업`
- Do not invent realistic confidential-looking part numbers, contracts, contacts, schedules, or personnel data

Dashboard consistency:

- 확인이 필요한 업무: 12건
- 납품 지연: 3건
- 단종·대체 검토: 5건
- 변경 승인 대기: 4건
- The 12 required-action items must remain consistent with 3 + 5 + 4

Equipment search:

- Preserve the approved overall layout unless the user requests a redesign
- Support search, filtering, sorting, pagination, row selection, and a detail panel in the prototype
- Keep search/filter state separate from displayed result data

Change history:

- Replacement lineage must be the visual focus
- Show at least five hierarchy depths in the prototype dataset
- Use smooth, readable connections rather than awkward right-angle bends
- Keep the entire graph understandable through fit-to-view, zoom, pan, controls, and a minimap when appropriate
- A single equipment item may belong to multiple projects
- Use simple project labels such as `사업: 가`, `사업: 가 · 나`, and `사업: 나 · 다`
- Selecting a node or log entry must expose detailed history in a drawer or modal
- Do not assume replacement is one-to-one; branching and multiple successors may exist

## 7. Data and backend boundaries

The persistent data model is not finalized. Do not create a production schema from screen fields alone.

For now, treat the following as provisional domain concepts rather than confirmed tables:

- Equipment
- Part number
- Project
- Equipment-project relationship
- Delivery destination and schedule
- Contract
- Person or role assignment
- Calibration information
- Change request
- Approval action
- Audit event
- Replacement relationship

Important modeling assumptions that require explicit confirmation:

- Cardinality of equipment and projects
- One-to-one versus one-to-many or many-to-many replacement relations
- Effective start and end dates
- Project-specific replacement relations
- Current state versus immutable history
- Approval-state transitions
- Permissions and data-retention rules

Use mock APIs or request handlers that can later be replaced by a real backend. Centralize endpoint paths, request types, response types, error mapping, and mock fixtures.

## 8. Security and confidentiality

This repository must contain generic prototype material only.

Never add:

- Real company part numbers or equipment data
- Real contract prices or delivery schedules
- Real employee names, departments, phone numbers, or email addresses
- Internal documents or screenshots containing confidential information
- Company credentials, tokens, API keys, server addresses, or `.env` files

Use `.env.example` for configuration examples and placeholders only.

## 9. Working method

Before implementing a task:

1. Read this file and the relevant mockup or specification
2. State assumptions and identify unresolved business rules
3. Keep the change limited to the requested scope
4. Reuse existing design tokens and shared components
5. Add or update tests for behavior that can regress
6. Compare the result with the reference mockup

Do not refactor unrelated code during a scoped feature task.

Do not overwrite user changes or delete files merely to simplify implementation.

For Git work:

- Do not push directly to `main` unless the user explicitly requests it
- Prefer a focused branch such as `agent/equipment-search`
- Keep commits small and intentional
- Use concise commit messages such as `feat: implement equipment search filters`
- Open a draft pull request for implementation work unless the user requests another workflow

## 10. Verification requirements

After the project scripts exist, run the relevant available checks before handing off work. At minimum, implementation changes should pass the repository's defined equivalents of:

- Type checking
- Linting
- Unit tests
- Production build
- Targeted interaction or end-to-end tests when applicable

Also verify manually:

- No Korean text corruption
- No prohibited ranks or menu items
- User name remains `김책임`
- Dashboard counts are internally consistent
- Reference images were not modified
- Layout remains usable at the 1440×900 desktop baseline
- Loading, empty, error, and selected states do not break the layout

If a check cannot run, report the exact reason. Do not claim verification that was not performed.

## 11. Decision discipline

Separate facts into three categories:

- Confirmed: explicitly approved by the user
- Assumed: temporarily selected for prototyping
- Open: requires business or technical confirmation

Record material architectural or business-rule decisions in repository documentation when those files are introduced. Do not rely on chat history as the only source of project context.
