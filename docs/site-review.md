# Site Review - CSM Operational Console

Date: 2026-02-17

## What is already strong
- The dashboard already operationalizes AMER motions across cadence, workshops, EBRs, success plan governance, health updates, escalation cadence, and renewal readiness.
- Progressive disclosure and mode switching are in place and reduce noise for daily CSM execution.
- Multi-account context, compliance checks, and portfolio rollups are present and usable.

## Gaps found in this review
1. There was no single compact "customer + CSM" reference artifact that summarizes motions, targets, and practical use-case examples in one place.
2. Search/jump and navigation did not include a dedicated cheatsheet destination for fast orientation during live meetings.
3. There was no printable one-page cheatsheet export equivalent to the existing EBR export flow.

## Changes added in this update
- Added data-driven cheatsheet content source: `data/cheatsheet.json`.
- Added in-app `Cheatsheet` section to `index.html` with:
  - lifecycle flow diagram
  - customer priority vs CSM guidance matrix
  - operating rhythm rows
  - use-case examples
  - anti-patterns and better motions
- Added printable cheatsheet page: `print/cheatsheet.html`.
- Wired cheatsheet into app loading/rendering/search/jump/export paths in `assets/js/app.js`.
- Added visual styles for cheatsheet diagrams/cards in `assets/css/styles.css`.
