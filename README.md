# GitLab CSE On-Demand Dashboard

Static GitLab Pages-compatible operating dashboard for pooled Customer Success Engineering delivery.

## What this app provides
- Portfolio-first information architecture with grouped primary navigation:
  - Sidebar-first primary navigation for workflow routing (top bar reserved for utilities)
  - Today
  - Portfolio
  - Manager
  - Simulator
  - Accounts
  - Success Plans
  - Playbooks
  - Resources
  - Cheatsheet
- Default pooled command view on `/#/today` (and `/` auto-canonicalized) with:
  - Work Queue
  - Outliers with reasons
  - Program cards with invite/attendance actions
  - Pinned right-side Action Drawer
- Detailed portfolio table on `/portfolio` with working filters:
  - segment
  - renewal window
  - health color
  - stale data
  - lowest use-case
  - has open request
  - manager dashboard snapshot (health distribution, average adoption, renewal/engagement coverage, focus accounts)
- Account workspace on `/account/:id` with:
  - above-the-fold snapshot bar
  - tabbed dashboard grids (Snapshot, Adoption, Health & Risk, Outcomes, Engagement, Journey, Resources, Cheatsheet)
  - DevOps adoption journey map (Plan -> Secure) in Adoption tab
  - adoption maturity radar visual in Adoption tab
  - legacy section anchor IDs retained inside tabs
  - missing-data chips with inline edit modal (localStorage-backed)
  - pinned right-side Action Drawer
- Programs page (`/programs`) for webinars/labs/office-hours with attendance + registration logging.
- Playbooks page (`/playbooks`) with execution-ready CSE library, checklist persistence, and markdown artifact actions.
- Resources page (`/resources`) with customer-safe filtering.
- Export center (`/exports`) for portfolio/account export actions and share snapshot URL.
- Intake workflow (`/intake`) kept as a tools route for request capture + artifact generation.
- Operating Model Engine (rules-driven) that generates account-level next-best actions, risk alerts, executive triggers, and copy-ready issue templates.
- Simulator page (`/simulator`) for deterministic scenario modeling:
  - capability toggles + presets
  - lifecycle map + journey stage computation
  - next-best actions + impact forecast
  - copy/download markdown artifacts (success plan, executive summary, workshop plan, issue body)

## Routes
Hash-style routes are canonical for GitLab/GitHub Pages reliability:
- `/#/today` -> Today console (default)
- `/#/portfolio` -> Portfolio operating table
- `/#/manager` -> Team-level manager dashboard
- `/#/simulator` -> Adoption simulator
- `/#/account/:id` -> Account workspace
- `/#/account` -> redirects to selected/default account
- `/#/toolkit` -> Success Plans workspace (generators + visuals)
- `/#/success-plans` -> alias route to Success Plans workspace
- `/#/programs` -> 1:many enablement programs
- `/#/playbooks` -> Response plans + checklist execution
- `/#/resources` -> Curated handbook resources
- `/#/exports` -> Export center
- `/#/intake` -> Engagement request intake

Path-style links are still accepted and auto-canonicalized to hash routes.
`404.html` redirects deep links to the matching hash route.

## Data model
Canonical app data lives under `data/`:
- `data/accounts.json`
- `data/requests.json`
- `data/programs.json`
- `data/playbooks.json`
- `data/resources.json`
- `data/rules.json`
- `data/simulator_capabilities.json`
- `data/simulator_rules.json`
- `data/schema.md` (field definitions + customer-safe policy)

## Local state keys
The app persists interactive state with canonical `gh_*` keys and auto-migrates legacy `glh-*` keys:
- `gh_customer_safe_mode`
- `gh_engagement_log_v1`
- `gh_user_overrides_v1`
- `gh_gitlab_base_url`
- `gh_gitlab_project_path`

Current seeded sample size:
- `accounts.json`: 12 realistic accounts (varied health/adoption/renewal states)
- `programs.json`: 8 programs (webinars, hands-on labs, office hours)
- `requests.json`: 18 requests
- `playbooks.json`: 7 category-aligned CSE playbooks with trigger signals, execution agendas, and generated artifacts

## Local run
Run a static server from repo root:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/`.

## Tests
Run test suite (Node built-in test runner):

```powershell
node --test src/tests/*.test.mjs
```

Coverage includes:
- customer-safe export redaction denylist enforcement
- portfolio CSV shape and key values
- intake artifact generation requirements
- routing behavior for `/account/:id`, `/playbooks`, and `/exports`

Note:
- In restricted local Windows environments where node test subprocess spawning is blocked, run:

```powershell
node --test --test-isolation=none src/tests/*.test.mjs
```

## GitLab Pages deployment
`.gitlab-ci.yml` now has:
- `test` stage: installs Node in Alpine and runs `node --test src/tests/*.test.mjs`
- `pages` stage: publishes static app on default branch

Published artifact includes:
- `index.html`, `404.html`, `.nojekyll`
- `assets/`, `src/`, `data/`, `print/`

In GitLab, open **Deploy -> Pages** after pipeline success to access the live site URL.
