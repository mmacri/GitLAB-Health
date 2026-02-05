# Audience Modes

## Purpose
The dashboard supports two audience-safe render modes:

- `Internal` (default): full CSM operating console, including triage and escalation execution detail.
- `Customer Safe`: customer-shareable view that preserves outcomes and next steps while removing internal-only risk handling detail.

## Hidden in Customer Safe
The following content is intentionally hidden via `data-audience="internal"` blocks and audience-aware copy logic:

- Escalation severity labels (`P1/P2/P3`) in the Health update cadence panel.
- Triage state and triage recovery checklist details in the Cadence tracker.
- Internal triage banner language (non-engaged/triage operational wording).
- Existing internal-only panels already tagged in the UI:
  - Risk register and mitigation detail cards.
  - Internal health response playbooks.
  - Internal collaboration escalation template.

## Always Visible in Customer Safe
The following are preserved for external sharing:

- Today Console summary, due work, and action links.
- AMER expectation status rows with customer-safe reasoning.
- Lifecycle summaries (Health, Engagement, Outcomes, Expand & Renew).
- Adoption scorecards, milestones, workshop/EBR roadmap, and outcomes.
- Success plan progress and validation status.
- Resource registry and handbook links.

## URL Control
Audience mode can be set from URL query params:

- `?audience=internal`
- `?audience=customer`

Mode is also persisted in `localStorage` key `gl-health-audience`.
