# GitLab Enterprise Customer Success Dashboard

Static dashboard site ready for GitHub Pages deployment.

## Quick deploy (GitHub Pages)
1. Push this repo to GitHub.
2. In **Settings -> Pages**, set **Source** to your default branch (e.g. `main`) and **/ (root)**.
3. Save. GitHub Pages will publish the site and provide a URL.

## Update data
Edit `data/metrics.json` to reflect customer metrics, targets, and milestone dates.

## Local preview
Browsers block `fetch()` on `file://` URLs. Use a local web server instead:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.
