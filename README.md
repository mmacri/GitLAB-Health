# GitLab CSE Operating Console (Static)

Static GitLab Pages-compatible Customer Success Engineering operating console aligned to the pooled CSE model (Align -> Enable -> Expand).

## UI Design System Alignment
The UI layer follows GitLab Pajamas-inspired product patterns:
- Dashboard hierarchy: KPI row -> panel grid -> action queue -> table panels
- Reusable card/panel structure
- Consistent badges/chips for status
- Shared typography/spacing tokens
- Keyboard-visible focus and accessible control states

Reference docs:
- https://design.gitlab.com/
- https://design.gitlab.com/patterns/dashboards
- https://design.gitlab.com/components/card
- https://design.gitlab.com/components/dashboard-panel
- https://design.gitlab.com/components/badge
- https://design.gitlab.com/brand-design/color
- https://design.gitlab.com/brand-design/typography

## Theme Tokens
Primary token/style files:
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components.css`
- `src/styles/utilities.css`

Core token groups:
- Surfaces/text: `--gl-bg`, `--gl-surface`, `--gl-surface-2`, `--gl-border`, `--gl-text`, `--gl-text-muted`
- Brand/status: `--gl-brand-orange`, `--gl-brand-purple`, `--gl-brand-teal`, `--gl-success`, `--gl-warning`, `--gl-danger`, `--gl-info`
- Spacing/radius: `--gl-space-1..8`, `--gl-radius-1..3`
- Elevation/focus: `--gl-shadow-1`, `--gl-shadow-2`, `--gl-focus`

Theme mode:
- Light and dark themes are driven by `html[data-theme]`
- Persisted key: `gh_theme_v1`

## Core capabilities
- Portfolio command center on `/#/today`
- Portfolio triage table on `/#/portfolio`
- Customer directory + drill-in workspace with technical adoption, success plans, risk, expansion, and VOC
- Programs and cohort funnel tracking
- Deterministic risk + expansion signal engine (no AI, no backend)
- Manager dashboard with adoption/health/program trends
- Report center + CSV/PDF exports
- Settings for sample load, import/export, reset, scoring weights, template management

## Routes
- `/#/today`
- `/#/portfolio`
- `/#/customers`
- `/#/customer/:id`
- `/#/programs`
- `/#/program/:id`
- `/#/risks`
- `/#/expansion`
- `/#/voc`
- `/#/manager`
- `/#/reports`
- `/#/settings`
- Existing legacy routes are still supported: `/#/account/:id`, `/#/journey/:id`, `/#/toolkit`, `/#/playbooks`, `/#/resources`, `/#/simulator`, `/#/exports`, `/#/intake`.

## Data model
Primary persisted model: `workspace` (`version: 3.0.0`) in localStorage key `gh_workspace_v3`.

Workspace shape (high-level):
- `portfolio`
- `customers[]`
- `adoption[customerId]` (DevSecOps stages + use-case % + time-to-value milestones)
- `successPlans[customerId]` (outcomes + milestones)
- `programs[]` (cohort + funnel + impact + sessions)
- `engagements[customerId][]`
- `risk[customerId]` (signals + playbook + dismissals + override)
- `expansion[customerId][]`
- `voc[]`
- `team`
- `snapshots[]`
- `settings` (templates + scoring weights)

Seed file:
- `data/workspace.sample.json`

Legacy static datasets are still loaded and supported:
- `data/accounts.json`
- `data/requests.json`
- `data/programs.json`
- `data/playbooks.json`
- `data/resources.json`
- `data/rules.json`
- `data/simulator_capabilities.json`
- `data/simulator_rules.json`

## LocalStorage keys
- `gh_workspace_v3`
- `gh_customer_safe_mode`
- `gh_engagement_log_v1`
- `gh_user_overrides_v1`
- `gh_requests_v1`
- `gh_program_attendance_v1`
- `gh_playbook_checklist_v1`
- `gh_action_cards_v1`
- `gh_density_v1`
- `gh_default_mode_v1`
- `gh_default_persona_v1`
- `gh_theme_v1`
- `gh_selected_account_id`
- `gh_gitlab_base_url`
- `gh_gitlab_project_path`

## Scoring model
Computed in `src/lib/scoring.js`:
- `adoptionScore` (use-case average + DevSecOps stage completion)
- `engagementScore` (recency + frequency)
- `riskScore` (deterministic signals + playbook burden)
- `pteScore` / `pteBand` (Propensity to Expand proxy; handbook-aligned deterministic model)
- `ptcScore` / `ptcBand` (Propensity to Churn/Contract proxy; handbook-aligned deterministic model)
- `health` (Green/Yellow/Red) with optional customer override

Auto-derived risk signals:
- `LOW_ENGAGEMENT`
- `RENEWAL_SOON`
- `LOW_SECURITY_ADOPTION`
- `LOW_CICD_ADOPTION`
- `NO_TIME_TO_VALUE`
- `STAGE_GAP_SECURE`

Risk operations:
- Auto-signals can be dismissed per customer with `dismissedUntil` windows.
- Scoring weights are configurable in Settings and normalized to 100.
- PtE/PtC are intentionally labeled as proxy metrics because they emulate handbook model intent using static deterministic inputs.

## Exports
- Portfolio CSV (workspace model columns)
- Customer CSV (workspace and legacy account variants)
- Customer summary PDF (workspace and legacy account variants; browser print-to-PDF)
- Manager summary PDF
- Programs CSV
- VOC CSV

Share URL:
- `buildShareSnapshotUrl(...)` supports encoded workspace snapshot payload (`ws` query param).

## Settings workflows
Route: `/#/settings`
- Load sample portfolio
- Import workspace JSON
- Export workspace JSON
- Reset local state
- Update scoring weights
- Add risk playbook templates
- Add program templates
- Create monthly snapshot
- Run workspace integrity checks before import/export (`npm run integrity`)

## Run locally
```powershell
python -m http.server 8000
```

Open: `http://localhost:8000/#/today`

## Tests
Node built-in test runner:

```powershell
npm test
```

Integrity check:

```powershell
npm run integrity
```

## GitLab Pages
The app is static and hash-routed for deep-link compatibility on GitLab Pages.

Deploy flow:
- run tests in CI
- publish static files (`index.html`, `404.html`, `src/`, `data/`, `assets/`, `print/`)

## Component Inventory
Reusable UI modules:
- `src/components/ui/Card.js` (`card`, `dashboardPanel`, `createCardElement`)
- `src/components/ui/Badge.js` (`badge`, `badgeToneFromHealth`)
- `src/components/ui/Button.js` (`buttonHtml`)
- `src/components/ui/Tabs.js` (`tabs`)
- `src/components/ui/Table.js` (`table`)
- `src/components/ui/EmptyState.js` (`uiEmptyState`)
- `src/components/ui/Skeleton.js` (`skeletonCard`)

## Extend With New Panels
To add a new dashboard panel:
1. Use `dashboardPanel(...)` or a `.card` section shell.
2. Apply status language with `statusChip(...)` / `badge(...)`.
3. Keep spacing on token scale (`--gl-space-*`) and avoid hard-coded values.
4. Wire page actions in the existing page module without altering storage model contracts.
