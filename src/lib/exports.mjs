import { formatDate, toIsoDate } from './date.mjs';
import { redactAccountForCustomer } from './redaction.mjs';

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const toCsv = (rows, columns) => {
  const header = columns.map((column) => csvEscape(column.label)).join(',');
  const body = rows
    .map((row) => columns.map((column) => csvEscape(column.value(row))).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

export const buildPortfolioRows = (accounts, requests) =>
  (accounts || []).map((account) => {
    const openRequests = (requests || []).filter(
      (request) => request.account_id === account.id && !['completed', 'closed'].includes(String(request.status).toLowerCase())
    ).length;

    return {
      account_id: account.id,
      account_name: account.name,
      segment: account.segment,
      renewal_date: account.renewal_date,
      health_overall: account.health?.overall || 'unknown',
      lifecycle_stage: account.health?.lifecycle_stage || 'unknown',
      platform_adoption_score: Number(account.adoption?.platform_adoption_score || 0),
      platform_adoption_level: account.adoption?.platform_adoption_level || '',
      open_requests: openRequests,
      next_touch_date: account.engagement?.next_touch_date || ''
    };
  });

export const buildPortfolioCsv = (accounts, requests) => {
  const rows = buildPortfolioRows(accounts, requests);
  const columns = [
    { label: 'account_id', value: (row) => row.account_id },
    { label: 'account_name', value: (row) => row.account_name },
    { label: 'segment', value: (row) => row.segment },
    { label: 'renewal_date', value: (row) => row.renewal_date },
    { label: 'health_overall', value: (row) => row.health_overall },
    { label: 'lifecycle_stage', value: (row) => row.lifecycle_stage },
    { label: 'platform_adoption_score', value: (row) => row.platform_adoption_score },
    { label: 'platform_adoption_level', value: (row) => row.platform_adoption_level },
    { label: 'open_requests', value: (row) => row.open_requests },
    { label: 'next_touch_date', value: (row) => row.next_touch_date }
  ];
  return toCsv(rows, columns);
};

export const buildAccountExportModel = (account, options = {}) => {
  const safeMode = Boolean(options.customerSafe);
  const source = safeMode ? redactAccountForCustomer(account) : JSON.parse(JSON.stringify(account || {}));
  const model = {
    id: source.id,
    name: source.name,
    segment: source.segment,
    renewal_date: source.renewal_date,
    health: source.health,
    adoption: source.adoption,
    engagement: source.engagement,
    outcomes: source.outcomes
  };

  if (!safeMode && source.internal_only) {
    model.internal_only = source.internal_only;
  }

  return model;
};

export const buildAccountCsv = (account, options = {}) => {
  const model = buildAccountExportModel(account, options);
  const scores = model.adoption?.use_case_scores || {};
  const rows = [
    {
      account_id: model.id,
      account_name: model.name,
      segment: model.segment,
      renewal_date: model.renewal_date,
      health_overall: model.health?.overall || '',
      adoption_health: model.health?.adoption_health || '',
      engagement_health: model.health?.engagement_health || '',
      lifecycle_stage: model.health?.lifecycle_stage || '',
      platform_adoption_score: model.adoption?.platform_adoption_score || '',
      platform_adoption_level: model.adoption?.platform_adoption_level || '',
      scm_score: scores.SCM ?? '',
      ci_score: scores.CI ?? '',
      cd_score: scores.CD ?? '',
      secure_score: scores.Secure ?? '',
      next_touch_date: model.engagement?.next_touch_date || '',
      outcomes_count: Array.isArray(model.outcomes?.objectives) ? model.outcomes.objectives.length : 0
    }
  ];

  const columns = Object.keys(rows[0]).map((key) => ({ label: key, value: (row) => row[key] }));
  return toCsv(rows, columns);
};

export const buildAccountSummaryHtml = (account, options = {}) => {
  const safeMode = Boolean(options.customerSafe);
  const model = buildAccountExportModel(account, options);
  const generatedAt = options.generatedAt || toIsoDate(new Date());
  const scores = model.adoption?.use_case_scores || {};
  const objectives = Array.isArray(model.outcomes?.objectives) ? model.outcomes.objectives : [];
  const internal = model.internal_only;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${model.name} Summary</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #1d1d23; }
      h1, h2 { margin: 0 0 8px; }
      h2 { margin-top: 22px; font-size: 18px; }
      .meta { color: #555; margin-bottom: 18px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; }
      .pill { display: inline-block; border: 1px solid #ccc; border-radius: 999px; padding: 3px 8px; margin-right: 6px; }
      ul { margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${model.name}</h1>
    <div class="meta">Segment: ${model.segment} | Renewal: ${formatDate(model.renewal_date)} | Generated: ${generatedAt} | Mode: ${
      safeMode ? 'Customer-safe' : 'Internal'
    }</div>

    <h2>Health</h2>
    <div class="grid">
      <div>Overall: <strong>${model.health?.overall || 'unknown'}</strong></div>
      <div>Lifecycle Stage: <strong>${model.health?.lifecycle_stage || 'unknown'}</strong></div>
      <div>Adoption Health: <strong>${model.health?.adoption_health || 'unknown'}</strong></div>
      <div>Engagement Health: <strong>${model.health?.engagement_health || 'unknown'}</strong></div>
    </div>

    <h2>Adoption</h2>
    <div>Platform Score: <strong>${model.adoption?.platform_adoption_score || 0}</strong> (${model.adoption?.platform_adoption_level || ''})</div>
    <div style="margin-top:8px;">
      <span class="pill">SCM ${scores.SCM ?? 'NA'}</span>
      <span class="pill">CI ${scores.CI ?? 'NA'}</span>
      <span class="pill">CD ${scores.CD ?? 'NA'}</span>
      <span class="pill">Secure ${scores.Secure ?? 'NA'}</span>
    </div>

    <h2>Outcomes</h2>
    <ul>
      ${objectives
        .map(
          (objective) => `<li>${objective.title} (${objective.status || 'in_progress'}) - due ${formatDate(objective.due_date)}</li>`
        )
        .join('') || '<li>No objectives captured.</li>'}
    </ul>

    <h2>Engagement</h2>
    <div class="grid">
      <div>Last Touch: <strong>${formatDate(model.engagement?.last_touch_date)}</strong></div>
      <div>Next Touch: <strong>${formatDate(model.engagement?.next_touch_date)}</strong></div>
      <div>Program Attendance (90d): <strong>${model.engagement?.program_attendance?.last_90d ?? 0}</strong></div>
    </div>

    ${
      safeMode || !internal
        ? ''
        : `<h2>Internal Notes</h2>
    <div><strong>Sentiment:</strong> ${internal.sentiment_notes || 'None'}</div>
    <div style="margin-top:8px;"><strong>Expansion Hypotheses:</strong></div>
    <ul>${(internal.expansion_hypotheses || []).map((item) => `<li>${item}</li>`).join('') || '<li>None</li>'}</ul>
    <div style="margin-top:8px;"><strong>Escalations:</strong></div>
    <ul>${(internal.escalations || [])
      .map((item) => `<li>${item.severity}: ${item.issue} (next update ${formatDate(item.next_update_due)})</li>`)
      .join('') || '<li>None</li>'}</ul>`
    }
  </body>
</html>`;
};

export const triggerDownload = (filename, text, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportPortfolioCsv = (accounts, requests) => {
  const csv = buildPortfolioCsv(accounts, requests);
  triggerDownload(`portfolio-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportAccountCsv = (account, options = {}) => {
  const csv = buildAccountCsv(account, options);
  const suffix = options.customerSafe ? 'customer-safe' : 'internal';
  triggerDownload(`${account.id}-${suffix}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportAccountSummaryPdf = (account, options = {}) => {
  const html = buildAccountSummaryHtml(account, options);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Browser print dialog allows "Save as PDF" and works in static environments.
  win.print();
};

export const buildShareSnapshotUrl = ({ origin = window.location.origin, basePath = '', route = '/', customerSafe = true }) => {
  const base = `${origin}${String(basePath || '').replace(/\/+$/, '')}/`;
  const query = new URLSearchParams();
  query.set('route', route);
  query.set('audience', customerSafe ? 'customer' : 'internal');
  return `${base}?${query.toString()}`;
};
