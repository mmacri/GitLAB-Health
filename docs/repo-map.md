# Repo Map

## Build and runtime model
- **Build system:** none (plain static HTML/CSS/JavaScript).
- **Rendering:** client-side rendering from `assets/js/app.js`.
- **Deployment model:** GitHub Pages static hosting (`.nojekyll` present).

## Key directories
- `index.html`: single-page dashboard layout and UI anchors.
- `assets/css/styles.css`: full visual system (cards, pills, grid layout, responsive behavior).
- `assets/js/app.js`: data loading, derived view-model assembly, and all section renderers.
- `assets/js/rules.js`: legacy next-action rule hooks used by the dashboard.
- `src/lib/dateUtils.js`: shared date math helpers (ISO parsing, day diffs, quarter boundaries).
- `src/lib/deriveAccountMetrics.js`: derived AMER operational metrics engine.
- `src/lib/handbookRules.js`: AMER compliance rule engine (`evaluateHandbookCompliance`).
- `data/accounts.json`: canonical multi-account data source for all dashboard sections.
- `data/resources.json`: canonical searchable handbook/resources registry.
- `scripts/verify-links.js`: resource link verifier (non-404 status checks).
- `docs/AMER-handbook-mapping.md`: requirement-to-UI/data mapping.

## Data flow into UI
1. `app.js` fetches `data/accounts.json` and `data/resources.json`.
2. Selected account is persisted via `localStorage` (`gl-health-account`).
3. Account data is normalized/validated (`DerivedMetrics.validateAccountData`).
4. Derived operational metrics are computed (`DerivedMetrics.deriveAccountMetrics`).
5. Handbook compliance checks are computed (`HandbookRules.evaluateHandbookCompliance`).
6. Portfolio rollups are computed across all accounts (`computePortfolioRollup` in `assets/js/app.js`).
7. `buildView(...)` composes formatted fields + list structures for rendering.
8. Render functions populate section lists/cards, compliance strip, portfolio rollup, cadence/triage engine, expand/renew panel, and searchable resources.
