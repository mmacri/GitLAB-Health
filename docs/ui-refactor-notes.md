# UI Refactor Notes

## Current implementation summary
- Build/runtime model: static GitHub Pages site using plain `HTML + CSS + vanilla JS`.
- Entry point: `index.html`.
- Styling: `assets/css/styles.css` with CSS variables and component classes.
- Rendering/data flow: client-side in `assets/js/app.js`.
- Data files:
  - `data/accounts.json` (canonical multi-account operational data)
  - `data/resources.json` (resource registry)
  - `data/account.sample.json` fallback
- Derived logic modules:
  - `src/lib/dateUtils.js`
  - `src/lib/deriveAccountMetrics.js`
  - `src/lib/handbookRules.js`
- Link validation:
  - `scripts/verify-links.js`

## Section/anchor map in current UI
- Overview header: `index.html#overview`
- Today Console: `index.html#today-console`
- AMER compliance strip: `index.html#handbook-compliance`
- Portfolio strip: `index.html#portfolio-rollup`
- Orientation strip: `index.html#orientation-strip`
- Executive snapshot: `index.html#overview-summary`
- Journey: `index.html#journey`
- Adoption: `index.html#adoption`
- Health & Risk: `index.html#health-risk`
  - Health update card: `index.html#health-updates`
  - Risk register drawer: `index.html#risk-register`
  - Playbooks drawer: `index.html#health-playbooks`
- Outcomes: `index.html#outcomes`
  - Success plan drawer: `index.html#success-plan`
  - Expand & Renew drawer: `index.html#expand-renew`
- Engagement & Enablement: `index.html#engagement`
  - Cadence tracker: `index.html#cadence-tracker`
  - Workshop tracker: `index.html#workshop-tracker`
  - Workshop plan: `index.html#workshop-plan`
  - EBR roadmap: `index.html#ebr-roadmap`
  - EBR prep drawer: `index.html#ebr-prep`
  - Enablement drawer: `index.html#enablement`
  - Collaboration drawer: `index.html#collaboration`
- Resources: `index.html#resources`

## Refactor implementation status
- Sticky operational header implemented with:
  - account context
  - health/renewal/engagement indicators
  - mode and audience toggles
  - quick jump search
  - share-view copy
- Guided modes are now disclosure controls (collapse/expand defaults), not hard visibility removals.
- Today Console is now the default task-first entry with:
  - next actions
  - due soon list
  - AMER quick checks
  - lifecycle summary cards with open/jump controls
- Audience-safe filtering documented and applied to internal-only triage/escalation blocks.

## Current navigation behavior
- Primary anchor nav in header (`data-nav-link`).
- Progress sidebar with section highlights (`data-progress-item`) using `IntersectionObserver`.
- Global command palette (`data-open-palette`, `#palette`) with keyboard shortcut support.
- Account switcher (`data-account-switcher`) with localStorage persistence.
- Mode and audience toggles persisted in localStorage and query params.

## Planned refactor changes and rationale
- Tighten sticky operational header:
  - Keep account/health/renewal/engagement state always visible.
  - Move quick jump/search into header for faster navigation.
  - Rationale: reduce context switching and “where am I” friction.
- Make Today/Review/Deep Dive the dominant workflow control:
  - Today: task-first and summary-first defaults.
  - Review: EBR/outcomes default expansion.
  - Deep Dive: full diagnostics default expansion.
  - Rationale: progressive disclosure without removing content.
- Promote Today Console to the primary landing workflow:
  - Next Actions + Due Soon + AMER quick checks + lifecycle summaries.
  - Rationale: align with daily CSM operating cadence.
- Harden audience-safe behavior:
  - Enforce `data-audience="internal"` hiding in customer-safe mode.
  - Document explicit content policy in `docs/audience-modes.md`.
  - Rationale: safe external sharing without leakage.
- Reframe sections as lifecycle cards with sub-navigation:
  - Health & Risk, Engagement & Enablement, Outcomes & Success Plan, Expand & Renew.
  - Keep full detail behind drawers/tabs and ensure <=2 click reachability.
  - Rationale: preserve capability while reducing visual overload.
- Improve sticky navigator + global jump:
  - Keep active section highlighting and add return-to-Today shortcut.
  - Expand search index to include actions and handbook terms.
  - Rationale: “never lost” navigation behavior.
