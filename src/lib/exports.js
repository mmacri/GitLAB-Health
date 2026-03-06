import { formatDate, toIsoDate } from './date.js';
import { redactAccountForCustomer } from './redaction.js';
import { buildManagerDashboard, buildWorkspacePortfolio } from './scoring.js';

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toBase64 = (text) => {
  if (typeof btoa === 'function') return btoa(text);
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'utf8').toString('base64');
  return '';
};

const fromBase64 = (text) => {
  if (typeof atob === 'function') return atob(text);
  if (typeof Buffer !== 'undefined') return Buffer.from(text, 'base64').toString('utf8');
  return '';
};

const toBase64Url = (text) => toBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromBase64Url = (text) => {
  const normalized = String(text || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? `${normalized}${'='.repeat(4 - pad)}` : normalized;
  return fromBase64(padded);
};

const normalizeDateOnly = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, 10);
};

const workspaceCustomerById = (workspace, customerId) =>
  (workspace?.customers || []).find((item) => item.id === customerId) || null;

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
      lifecycle_stage: account.lifecycle_stage || account.health?.lifecycle_stage || 'unknown',
      platform_adoption_score: Number(account.adoption?.platform_adoption_score || 0),
      platform_adoption_level: account.adoption?.platform_adoption_level || '',
      open_requests: openRequests,
      next_touch_date: account.engagement?.next_touch_date || ''
    };
  });

export const buildLegacyPortfolioCsv = (accounts, requests) => {
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

export const buildWorkspacePortfolioCsv = (workspace) => {
  const rows = (buildWorkspacePortfolio(workspace)?.rows || []).map((item) => ({
    customerId: item.customer.id,
    name: item.customer.name,
    tier: item.customer.tier,
    renewalDate: item.customer.renewalDate || '',
    health: item.health,
    adoptionScore: item.adoptionScore,
    engagementScore: item.engagementScore,
    riskScore: item.riskScore,
    pteScore: item.pteScore,
    ptcScore: item.ptcScore,
    pteBand: item.pteBand,
    ptcBand: item.ptcBand,
    pteDriver: item.pteDriver,
    ptcDriver: item.ptcDriver,
    cicdPercent: item.cicdPercent,
    securityPercent: item.securityPercent,
    lastEngagementDate: normalizeDateOnly(item.lastEngagementDate),
    openExpansionCount: item.openExpansionCount
  }));

  return toCsv(rows, [
    { label: 'customerId', value: (row) => row.customerId },
    { label: 'name', value: (row) => row.name },
    { label: 'tier', value: (row) => row.tier },
    { label: 'renewalDate', value: (row) => row.renewalDate },
    { label: 'health', value: (row) => row.health },
    { label: 'adoptionScore', value: (row) => row.adoptionScore },
    { label: 'engagementScore', value: (row) => row.engagementScore },
    { label: 'riskScore', value: (row) => row.riskScore },
    { label: 'pteScore', value: (row) => row.pteScore },
    { label: 'ptcScore', value: (row) => row.ptcScore },
    { label: 'pteBand', value: (row) => row.pteBand },
    { label: 'ptcBand', value: (row) => row.ptcBand },
    { label: 'pteDriver', value: (row) => row.pteDriver },
    { label: 'ptcDriver', value: (row) => row.ptcDriver },
    { label: 'cicdPercent', value: (row) => row.cicdPercent },
    { label: 'securityPercent', value: (row) => row.securityPercent },
    { label: 'lastEngagementDate', value: (row) => row.lastEngagementDate },
    { label: 'openExpansionCount', value: (row) => row.openExpansionCount }
  ]);
};

export const buildProgramsCsv = (workspace) => {
  const rows = (workspace?.programs || []).map((program) => ({
    id: program.id,
    name: program.name,
    type: program.type,
    startDate: program.startDate,
    endDate: program.endDate,
    invited: Number(program?.funnel?.invited || 0),
    attended: Number(program?.funnel?.attended || 0),
    completed: Number(program?.funnel?.completed || 0),
    cohortSize: (program?.cohortCustomerIds || []).length
  }));

  return toCsv(rows, [
    { label: 'id', value: (row) => row.id },
    { label: 'name', value: (row) => row.name },
    { label: 'type', value: (row) => row.type },
    { label: 'startDate', value: (row) => row.startDate },
    { label: 'endDate', value: (row) => row.endDate },
    { label: 'invited', value: (row) => row.invited },
    { label: 'attended', value: (row) => row.attended },
    { label: 'completed', value: (row) => row.completed },
    { label: 'cohortSize', value: (row) => row.cohortSize }
  ]);
};

export const buildVocCsv = (workspace) => {
  const customerLookup = (workspace?.customers || []).reduce((acc, customer) => {
    acc[customer.id] = customer.name;
    return acc;
  }, {});
  const rows = (workspace?.voc || []).map((entry) => ({
    id: entry.id,
    customerId: entry.customerId,
    customerName: customerLookup[entry.customerId] || entry.customerId,
    area: entry.area,
    request: entry.request,
    impact: entry.impact,
    status: entry.status,
    createdAt: normalizeDateOnly(entry.createdAt)
  }));
  return toCsv(rows, [
    { label: 'id', value: (row) => row.id },
    { label: 'customerId', value: (row) => row.customerId },
    { label: 'customerName', value: (row) => row.customerName },
    { label: 'area', value: (row) => row.area },
    { label: 'request', value: (row) => row.request },
    { label: 'impact', value: (row) => row.impact },
    { label: 'status', value: (row) => row.status },
    { label: 'createdAt', value: (row) => row.createdAt }
  ]);
};

export const buildAccountExportModel = (account, options = {}) => {
  const safeMode = Boolean(options.customerSafe);
  const source = safeMode ? redactAccountForCustomer(account) : JSON.parse(JSON.stringify(account || {}));
  const model = {
    id: source.id,
    name: source.name,
    segment: source.segment,
    renewal_date: source.renewal_date,
    lifecycle_stage: source.lifecycle_stage || source.health?.lifecycle_stage,
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

const buildWorkspaceAccountModel = (workspace, customerId, options = {}) => {
  const customer = workspaceCustomerById(workspace, customerId);
  if (!customer) return null;
  const portfolio = buildWorkspacePortfolio(workspace);
  const scored = (portfolio.rows || []).find((item) => item.customer.id === customerId);
  const adoption = workspace?.adoption?.[customerId] || {};
  const successPlan = workspace?.successPlans?.[customerId] || { outcomes: [], milestones: [] };
  const risk = workspace?.risk?.[customerId] || { signals: [], playbook: [], overrideHealth: null };
  const expansion = workspace?.expansion?.[customerId] || [];
  const engagements = workspace?.engagements?.[customerId] || [];
  const voc = (workspace?.voc || []).filter((item) => item.customerId === customerId);
  return {
    customer,
    scored,
    adoption,
    successPlan,
    risk,
    expansion,
    engagements,
    voc,
    customerSafe: Boolean(options.customerSafe)
  };
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
      lifecycle_stage: model.lifecycle_stage || model.health?.lifecycle_stage || '',
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

export const buildWorkspaceAccountCsv = (workspace, customerId, options = {}) => {
  const model = buildWorkspaceAccountModel(workspace, customerId, options);
  if (!model) return '';
  const useCases = model.adoption?.useCases || {};
  const rows = [
    {
      customerId: model.customer.id,
      name: model.customer.name,
      tier: model.customer.tier,
      renewalDate: model.customer.renewalDate,
      lifecycleStage: model.customer.stage,
      health: model.scored?.health || 'Yellow',
      adoptionScore: model.scored?.adoptionScore || 0,
      engagementScore: model.scored?.engagementScore || 0,
      riskScore: model.scored?.riskScore || 0,
      scmPercent: useCases.SCM?.percent || 0,
      cicdPercent: useCases.CICD?.percent || 0,
      securityPercent: useCases.Security?.percent || 0,
      compliancePercent: useCases.Compliance?.percent || 0,
      releaseAutomationPercent: useCases.ReleaseAutomation?.percent || 0,
      observabilityPercent: useCases.Observability?.percent || 0,
      openRiskSignals: (model.risk?.signals || []).length,
      openExpansion: (model.expansion || []).filter((item) => !['won', 'closed'].includes(String(item.status || '').toLowerCase())).length
    }
  ];
  return toCsv(rows, Object.keys(rows[0]).map((key) => ({ label: key, value: (row) => row[key] })));
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
      <div>Lifecycle Stage: <strong>${model.lifecycle_stage || model.health?.lifecycle_stage || 'unknown'}</strong></div>
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

export const buildWorkspaceAccountSummaryHtml = (workspace, customerId, options = {}) => {
  const model = buildWorkspaceAccountModel(workspace, customerId, options);
  if (!model) return '<html><body><p>Customer not found.</p></body></html>';
  const generatedAt = options.generatedAt || toIsoDate(new Date());
  const useCases = model.adoption?.useCases || {};
  const stages = model.adoption?.devsecopsStages || {};
  const milestones = model.adoption?.timeToValue || [];
  const outcomes = model.successPlan?.outcomes || [];
  const outcomeMilestones = model.successPlan?.milestones || [];
  const riskSignals = model.risk?.signals || [];
  const playbook = model.risk?.playbook || [];
  const expansion = model.expansion || [];
  const voc = model.voc || [];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${model.customer.name} CSE Summary</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 30px; color: #111827; }
      h1, h2, h3 { margin: 0 0 8px; }
      h2 { margin-top: 18px; font-size: 17px; }
      h3 { margin-top: 12px; font-size: 14px; }
      p, li { font-size: 12px; line-height: 1.5; }
      .meta { color: #475569; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px 16px; }
      .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 6px; font-size: 12px; vertical-align: top; }
      th { color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    </style>
  </head>
  <body>
    <h1>${model.customer.name}</h1>
    <p class="meta">
      Generated ${generatedAt} • Mode: ${model.customerSafe ? 'Customer-safe' : 'Internal'} • Tier: ${model.customer.tier} • Stage: ${model.customer.stage} • Renewal: ${formatDate(model.customer.renewalDate)}
    </p>

    <section class="card">
      <h2>Portfolio Scores</h2>
      <div class="grid">
        <p><strong>Health:</strong> ${model.scored?.health || 'Yellow'}</p>
        <p><strong>Adoption Score:</strong> ${model.scored?.adoptionScore || 0}</p>
        <p><strong>Engagement Score:</strong> ${model.scored?.engagementScore || 0}</p>
        <p><strong>Risk Score:</strong> ${model.scored?.riskScore || 0}</p>
      </div>
    </section>

    <section class="card">
      <h2>DevSecOps Stage Adoption</h2>
      <table>
        <thead><tr><th>Stage</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(stages)
            .map(([stage, status]) => `<tr><td>${stage}</td><td>${status}</td></tr>`)
            .join('')}
        </tbody>
      </table>
      <h3>Use Case Adoption</h3>
      <table>
        <thead><tr><th>Use Case</th><th>Percent</th><th>Evidence</th></tr></thead>
        <tbody>
          ${Object.entries(useCases)
            .map(([key, value]) => `<tr><td>${key}</td><td>${value?.percent || 0}%</td><td>${value?.evidence || ''}</td></tr>`)
            .join('')}
        </tbody>
      </table>
      <h3>Time-to-Value Milestones</h3>
      <ul>
        ${milestones.length ? milestones.map((item) => `<li>${item.milestone}: ${formatDate(item.date)} (${item.status})</li>`).join('') : '<li>No milestones captured</li>'}
      </ul>
    </section>

    <section class="card">
      <h2>Success Plan</h2>
      <h3>Outcomes</h3>
      <ul>
        ${outcomes.length
          ? outcomes.map((item) => `<li>${item.statement} • ${item.metric} • target ${item.target} • due ${formatDate(item.due)} • ${item.status}</li>`).join('')
          : '<li>No outcomes defined.</li>'}
      </ul>
      <h3>Milestones</h3>
      <ul>
        ${outcomeMilestones.length
          ? outcomeMilestones.map((item) => `<li>${item.title} • owner ${item.owner} • due ${formatDate(item.due)} • ${item.status}</li>`).join('')
          : '<li>No milestones defined.</li>'}
      </ul>
    </section>

    <section class="card">
      <h2>Risk + Expansion</h2>
      <h3>Risk Signals</h3>
      <ul>
        ${riskSignals.length
          ? riskSignals.map((signal) => `<li>${signal.code} (${signal.severity}) - ${signal.detail}</li>`).join('')
          : '<li>No active risk signals.</li>'}
      </ul>
      <h3>Mitigation Playbook</h3>
      <ul>
        ${playbook.length ? playbook.map((item) => `<li>${item.action} • owner ${item.owner} • due ${formatDate(item.due)} • ${item.status}</li>`).join('') : '<li>No mitigation actions.</li>'}
      </ul>
      <h3>Expansion Opportunities</h3>
      <ul>
        ${expansion.length
          ? expansion.map((item) => `<li>${item.title} (${item.status}) - ${item.rationale}</li>`).join('')
          : '<li>No expansion opportunities.</li>'}
      </ul>
    </section>

    <section class="card">
      <h2>Voice of Customer</h2>
      <ul>
        ${voc.length ? voc.map((item) => `<li>${item.area}: ${item.request} (${item.status})</li>`).join('') : '<li>No VOC entries.</li>'}
      </ul>
    </section>
  </body>
</html>`;
};

export const buildManagerSummaryHtml = (workspace, options = {}) => {
  const manager = buildManagerDashboard(workspace);
  const generatedAt = options.generatedAt || toIsoDate(new Date());
  const health = manager.portfolio.healthDistribution || {};
  const adoption = manager.portfolio.adoptionCoverage || {};
  const engagement = manager.portfolio.engagementCoverage || {};
  const atRisk = manager.portfolio.atRisk || [];
  const pteSummary = manager.pteSummary || { high: 0, medium: 0, low: 0 };
  const ptcSummary = manager.ptcSummary || { high: 0, medium: 0, low: 0 };
  const propensityQuadrants = manager.propensityQuadrants || {
    expandAndRetain: 0,
    growWithRisk: 0,
    stabilizeThenExpand: 0,
    monitor: 0
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Manager Summary</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1, h2 { margin: 0 0 8px; }
      h2 { margin-top: 20px; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 6px; font-size: 12px; }
      th { font-size: 11px; text-transform: uppercase; color: #475569; }
      .meta { color: #475569; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; }
    </style>
  </head>
  <body>
    <h1>CSE Manager Summary</h1>
    <p class="meta">Generated ${generatedAt} • Customers: ${(manager.portfolio.rows || []).length}</p>

    <h2>Portfolio KPI</h2>
    <div class="grid">
      <p><strong>Health Green:</strong> ${health.green || 0}</p>
      <p><strong>Health Yellow:</strong> ${health.yellow || 0}</p>
      <p><strong>Health Red:</strong> ${health.red || 0}</p>
      <p><strong>Average Adoption:</strong> ${adoption.avgAdoption || 0}</p>
      <p><strong>Average CI/CD:</strong> ${adoption.avgCicd || 0}%</p>
      <p><strong>Average Security:</strong> ${adoption.avgSecurity || 0}%</p>
      <p><strong>Engagement 0-30d:</strong> ${engagement.in30 || 0}</p>
      <p><strong>Engagement 31-60d:</strong> ${engagement.in60 || 0}</p>
      <p><strong>Engagement 61-90d:</strong> ${engagement.in90 || 0}</p>
      <p><strong>Engagement 90d+:</strong> ${engagement.over90 || 0}</p>
      <p><strong>PtE High / Medium / Low:</strong> ${pteSummary.high} / ${pteSummary.medium} / ${pteSummary.low}</p>
      <p><strong>PtC High / Medium / Low:</strong> ${ptcSummary.high} / ${ptcSummary.medium} / ${ptcSummary.low}</p>
    </div>

    <h2>PtE x PtC Segment Grid</h2>
    <div class="grid">
      <p><strong>Expand + Retain:</strong> ${propensityQuadrants.expandAndRetain}</p>
      <p><strong>Grow with Risk:</strong> ${propensityQuadrants.growWithRisk}</p>
      <p><strong>Stabilize then Expand:</strong> ${propensityQuadrants.stabilizeThenExpand}</p>
      <p><strong>Monitor:</strong> ${propensityQuadrants.monitor}</p>
    </div>

    <h2>Top 10 At-Risk Customers</h2>
    <table>
      <thead><tr><th>Customer</th><th>Health</th><th>Risk Score</th><th>PtE</th><th>PtC</th><th>Primary Signal</th><th>Renewal</th></tr></thead>
      <tbody>
        ${
          atRisk.length
            ? atRisk
                .slice(0, 10)
                .map(
                  (item) =>
                    `<tr><td>${item.customer.name}</td><td>${item.health}</td><td>${item.riskScore}</td><td>${item.pteScore} (${item.pteBand})</td><td>${item.ptcScore} (${item.ptcBand})</td><td>${item.riskSignals?.[0]?.code || 'None'}</td><td>${formatDate(item.customer.renewalDate)}</td></tr>`
                )
                .join('')
            : '<tr><td colspan="7">No at-risk customers.</td></tr>'
        }
      </tbody>
    </table>

    <h2>Programs Overview</h2>
    <table>
      <thead><tr><th>Program</th><th>Type</th><th>Invited</th><th>Attended</th><th>Completed</th><th>Conversion</th></tr></thead>
      <tbody>
        ${
          (manager.programs || []).length
            ? manager.programs
                .map(
                  (program) => `<tr><td>${program.name}</td><td>${program.type}</td><td>${program.invited}</td><td>${program.attended}</td><td>${program.completed}</td><td>${program.conversionRate}%</td></tr>`
                )
                .join('')
            : '<tr><td colspan="6">No program data available.</td></tr>'
        }
      </tbody>
    </table>
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

export const buildPortfolioCsv = (source, requests = []) => {
  if (source && typeof source === 'object' && !Array.isArray(source) && Array.isArray(source.customers)) {
    return buildWorkspacePortfolioCsv(source);
  }
  return buildLegacyPortfolioCsv(Array.isArray(source) ? source : [], requests);
};

export const exportPortfolioCsv = (source, requests = []) => {
  const csv = buildPortfolioCsv(source, requests);
  triggerDownload(`portfolio-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportProgramsCsv = (workspace) => {
  const csv = buildProgramsCsv(workspace);
  triggerDownload(`programs-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportVocCsv = (workspace) => {
  const csv = buildVocCsv(workspace);
  triggerDownload(`voc-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportAccountCsv = (source, options = {}) => {
  if (source && typeof source === 'object' && !Array.isArray(source) && Array.isArray(source.customers)) {
    const customerId = options.customerId || '';
    const csv = buildWorkspaceAccountCsv(source, customerId, options);
    if (!csv) return;
    const suffix = options.customerSafe ? 'customer-safe' : 'internal';
    triggerDownload(`${customerId || 'customer'}-${suffix}.csv`, csv, 'text/csv;charset=utf-8');
    return;
  }
  const csv = buildAccountCsv(source, options);
  const suffix = options.customerSafe ? 'customer-safe' : 'internal';
  triggerDownload(`${source.id}-${suffix}.csv`, csv, 'text/csv;charset=utf-8');
};

export const exportAccountSummaryPdf = (source, options = {}) => {
  const html =
    source && typeof source === 'object' && !Array.isArray(source) && Array.isArray(source.customers)
      ? buildWorkspaceAccountSummaryHtml(source, options.customerId, options)
      : buildAccountSummaryHtml(source, options);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

export const exportManagerSummaryPdf = (workspace, options = {}) => {
  const html = buildManagerSummaryHtml(workspace, options);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

const compactSnapshot = (workspace) => {
  const portfolio = buildWorkspacePortfolio(workspace);
  return {
    version: workspace?.version || '3.0.0',
    updatedAt: workspace?.updatedAt || new Date().toISOString(),
    portfolio: workspace?.portfolio || {},
    customers: (workspace?.customers || []).map((customer) => ({
      id: customer.id,
      name: customer.name,
      tier: customer.tier,
      renewalDate: customer.renewalDate,
      stage: customer.stage,
      primaryUseCase: customer.primaryUseCase
    })),
    scores: (portfolio.rows || []).map((row) => ({
      id: row.customer.id,
      health: row.health,
      adoption: row.adoptionScore,
      engagement: row.engagementScore,
      risk: row.riskScore,
      pte: row.pteScore,
      pteBand: row.pteBand,
      ptc: row.ptcScore,
      ptcBand: row.ptcBand,
      cicd: row.cicdPercent,
      security: row.securityPercent
    })),
    programs: (workspace?.programs || []).map((program) => ({
      id: program.id,
      name: program.name,
      type: program.type,
      invited: Number(program?.funnel?.invited || 0),
      attended: Number(program?.funnel?.attended || 0),
      completed: Number(program?.funnel?.completed || 0)
    }))
  };
};

export const encodeWorkspaceSnapshot = (workspace) => {
  const payload = compactSnapshot(workspace);
  return toBase64Url(encodeURIComponent(JSON.stringify(payload)));
};

export const decodeWorkspaceSnapshot = (encoded) => {
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(fromBase64Url(String(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const buildShareSnapshotUrl = ({
  origin = typeof window !== 'undefined' ? window.location.origin : '',
  basePath = '',
  route = '/',
  customerSafe = true,
  workspace = null
}) => {
  const base = `${origin}${String(basePath || '').replace(/\/+$/, '')}/`;
  const query = new URLSearchParams();
  query.set('route', route);
  query.set('audience', customerSafe ? 'customer' : 'internal');
  if (workspace) {
    query.set('ws', encodeWorkspaceSnapshot(workspace));
  }
  return `${base}?${query.toString()}`;
};
