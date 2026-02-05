# GitLab Enterprise Customer Success Dashboard

Static dashboard site ready for GitHub Pages deployment.

## Quick deploy (GitHub Pages)
1. Push this repo to GitHub.
2. In **Settings -> Pages**, set **Source** to your default branch (e.g. `main`) and **/ (root)**.
3. Save. GitHub Pages will publish the site and provide a URL.

## Update data
Edit these canonical data files:
- `data/accounts.json`: multi-account operational data (milestones, cadence, success plan, expansion, risk).
  - Includes non-engaged triage fields (`triage_state`, `triage_recovery_plan.*`) used by cadence automation cues.
- `data/resources.json`: searchable handbook and docs registry.

When the site is served via a static server, the dashboard loads both files directly. If data cannot be loaded, the dashboard falls back to the embedded sample object in `assets/js/app.js`.
The executive PDF export uses `print/ebr.html`.

### Validate resource links
Run the built-in verifier before publishing:

```powershell
node scripts/verify-links.js
```

## Persona guide
- Executive: review Overview, Success Plan, Top Risks, and DORA snapshot.
- DevOps leader: focus on Adoption, Landing Zone, and Enablement workshops.
- CSM: use Health & Risk, Engagement cadence, and Collaboration templates.

## Local preview
Use a local web server to load the live JSON data:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.
