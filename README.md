# GitLab CSE Operating Console (Static)

Static GitLab Pages-compatible Customer Success Engineering operating console aligned to the pooled CSE model (Align -> Enable -> Expand).

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
- `risk[customerId]` (signals + playbook + override)
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
- `gh_selected_account_id`
- `gh_gitlab_base_url`
- `gh_gitlab_project_path`

## Scoring model
Computed in `src/lib/scoring.js`:
- `adoptionScore` (use-case average + DevSecOps stage completion)
- `engagementScore` (recency + frequency)
- `riskScore` (deterministic signals + playbook burden)
- `health` (Green/Yellow/Red) with optional customer override

Auto-derived risk signals:
- `LOW_ENGAGEMENT`
- `RENEWAL_SOON`
- `LOW_SECURITY_ADOPTION`
- `LOW_CICD_ADOPTION`
- `NO_TIME_TO_VALUE`

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

## Run locally
```powershell
python -m http.server 8000
```

Open: `http://localhost:8000/#/today`

## Tests
Node built-in test runner:

```powershell
node --test --test-isolation=none src/tests/*.mjs
```

`--test-isolation=none` is used because some Windows environments block child process spawn in isolated mode.

## GitLab Pages
The app is static and hash-routed for deep-link compatibility on GitLab Pages.

Deploy flow:
- run tests in CI
- publish static files (`index.html`, `404.html`, `src/`, `data/`, `assets/`, `print/`)
