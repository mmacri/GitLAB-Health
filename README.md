# GitLab Enterprise Customer Success Dashboard

Static dashboard site ready for GitHub Pages deployment.

## Quick deploy (GitHub Pages)
1. Push this repo to GitHub.
2. In **Settings -> Pages**, set **Source** to your default branch (e.g. `main`) and **/ (root)**.
3. Save. GitHub Pages will publish the site and provide a URL.

## Update data
Edit `data/dashboard.json` to reflect customer metrics, targets, and milestone dates. This file drives every section:
- Customer profile, renewal timing, deployment type
- Seat utilization + onboarding milestones
- Adoption use case scores + landing zones
- Health scores, risks, and success plan objectives
- DORA + Value Stream Analytics metrics
- Engagement cadence, touchpoints, and collaboration project templates

When the site is served via a static server, the dashboard loads `data/dashboard.json` directly. If you open the HTML file without a server, the dashboard falls back to the embedded sample data in `assets/js/app.js`.
To add a new customer, duplicate `data/dashboard.json`, update values, and point the dashboard to the new file (or replace the contents for a single-customer instance).
The executive PDF export uses `print/ebr.html` and pulls from the same data source.

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
