# GitLab CSE On-Demand Dashboard

Static GitLab Pages-compatible operating dashboard for pooled Customer Success Engineering delivery.

## What this app provides
- Pooled triage-first homepage (`/`) with:
  - Today Queue
  - Outliers + filters
  - Requests Triage
  - Upcoming 1:many programs
- Intake workflow (`/intake`) that creates request records and generates copy-ready artifacts:
  - Collaboration issue body (GitLab markdown)
  - Customer-safe meeting agenda
  - Customer-safe follow-up email
- Account workspace (`/account/:id`) with action drawer, lifecycle context, adoption/health/outcomes tabs, and exports.
- Programs page (`/programs`) with webinar/lab/office-hours cards and local attendance/registration logging.
- Resources page (`/resources`) with handbook-aligned references and customer-safe filtering.

## Routes
- `/` -> Portfolio (pooled coverage)
- `/intake` -> Engagement request intake
- `/programs` -> 1:many CSE programs
- `/resources` -> Handbook resources
- `/account/:id` -> Account drill-in workspace

`404.html` includes SPA fallback redirect so deep links work on static Pages hosting.

## Data model
Canonical app data lives under `data/`:
- `data/accounts.json`
- `data/requests.json`
- `data/programs.json`
- `data/playbooks.json`
- `data/resources.json`
- `data/schema.md` (field definitions + customer-safe policy)

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
- routing behavior for `/account/:id`

## GitLab Pages deployment
`.gitlab-ci.yml` now has:
- `test` stage: runs `node --test src/tests/*.test.mjs` on pushes/MRs
- `pages` stage: publishes static app on default branch

Published artifact includes:
- `index.html`, `404.html`, `.nojekyll`
- `assets/`, `src/`, `data/`, `print/`

In GitLab, open **Deploy -> Pages** after pipeline success to access the live site URL.
