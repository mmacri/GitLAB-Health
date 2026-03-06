import { createDataTable } from '../components/dataTable.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { createAdoptionStageWidget, compactAdoptionDots } from '../components/adoption/AdoptionStageWidget.js';
import { createManagerOverviewPanel } from '../components/manager/ManagerOverviewPanel.js';
import { createEmptyState } from '../components/EmptyState.js';
import { barChartSvg, donutChartSvg } from '../lib/charts.js';
import { formatDate, parseDate } from '../lib/date.js';
import { loadEngagementLog } from '../lib/engagementLog.js';
import { applyPortfolioFilters } from '../lib/scoring.js';
import { ENGAGEMENT_TYPES, normalizeEngagementType } from '../config/engagementTypes.js';
import { MATURITY_LEVELS, USE_CASES } from '../data/adoptionStages.js';

const uniqueSegments = (signals) => ['all', ...new Set((signals || []).map((signal) => signal.account.segment))];

const uniqueUseCases = (signals) =>
  ['all', ...new Set((signals || []).map((signal) => String(signal.lowestUseCaseName || '').toLowerCase()))].filter(Boolean);

const toTime = (value) => parseDate(value)?.getTime() || Number.POSITIVE_INFINITY;

const queueRow = (item) => `
  <tr>
    <td><a href="#" data-open-account="${item.account_id}">${item.account_name}</a></td>
    <td>${item.topic}</td>
    <td>${item.stage}</td>
    <td>${formatDate(item.due_date)}</td>
    <td>${statusChip({ label: item.status, tone: item.urgency })}</td>
    <td>${item.assigned_to || 'Unassigned'}</td>
  </tr>
`;

const renderSignalList = (signals, renderItem, empty, limit = 6) =>
  signals.length
    ? `<ul class="simple-list">${signals
        .slice(0, limit)
        .map((signal) => `<li>${renderItem(signal)}</li>`)
        .join('')}</ul>`
    : `<p class="empty-text">${empty}</p>`;

const outlierCard = (signal, staleDays) => `
  <article class="card compact-card outlier-card">
    <div class="metric-head">
      <h3><a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a></h3>
      ${statusChip({ label: signal.account.health?.overall || 'unknown', tone: statusToneFromHealth(signal.account.health?.overall) })}
    </div>
    <p class="muted">Lifecycle: ${signal.account.lifecycle_stage || signal.account.health?.lifecycle_stage || 'enable'}</p>
    <p class="muted">Adoption: ${signal.greenUseCaseCount || 0}/4 green | Renewal: ${signal.renewalDays ?? 'n/a'} days</p>
    <p class="muted">Last engagement: ${formatDate(signal.account.engagement?.last_touch_date)} | Stale threshold: ${staleDays}d</p>
    <p class="muted">${signal.reasons.slice(0, 2).join(' | ') || 'No active flags.'}</p>
  </article>
`;

const upcomingEngagements = (signals, days = 14) =>
  (signals || [])
    .filter((signal) => {
      const nextTouch = signal.account.engagement?.next_touch_date;
      const nextEbr = signal.account.engagement?.next_ebr_date;
      const touchDueIn = nextTouch ? Math.floor((toTime(nextTouch) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const ebrDueIn = nextEbr ? Math.floor((toTime(nextEbr) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const touchInWindow = touchDueIn !== null && touchDueIn >= 0 && touchDueIn <= days;
      const ebrInWindow = ebrDueIn !== null && ebrDueIn >= 0 && ebrDueIn <= days;
      return touchInWindow || ebrInWindow;
    })
    .sort((left, right) => {
      const leftTouch = toTime(left.account.engagement?.next_touch_date);
      const leftEbr = toTime(left.account.engagement?.next_ebr_date);
      const rightTouch = toTime(right.account.engagement?.next_touch_date);
      const rightEbr = toTime(right.account.engagement?.next_ebr_date);
      return Math.min(leftTouch, leftEbr) - Math.min(rightTouch, rightEbr);
    });

const recentHealthChanges = (signals) =>
  (signals || [])
    .flatMap((signal) =>
      (signal.account.change_log || [])
        .filter((entry) => ['Risk', 'Usage', 'Outcomes'].includes(entry.category))
        .map((entry) => ({
          account: signal.account,
          entry
        }))
    )
    .sort((left, right) => toTime(right.entry.date) - toTime(left.entry.date));

const operatingLoopVisual = () => `
  <section class="card">
    <div class="metric-head">
      <h2>CSE Operating Loop</h2>
      ${statusChip({ label: 'Workflow', tone: 'neutral' })}
    </div>
    <div class="flow-steps">
      <article class="flow-step">
        <strong>1. Triage</strong>
        <p>Prioritize yellow/red, stale, and renewal-window accounts.</p>
      </article>
      <article class="flow-step">
        <strong>2. Enable</strong>
        <p>Route to webinar, lab, office hours, or focused account engagement.</p>
      </article>
      <article class="flow-step">
        <strong>3. Validate</strong>
        <p>Capture adoption movement, outcomes, and risk closure evidence.</p>
      </article>
      <article class="flow-step">
        <strong>4. Communicate</strong>
        <p>Share customer-safe summary and next best action.</p>
      </article>
    </div>
  </section>
`;

const healthMatrix = (signals = []) => {
  const bins = {
    scale_and_expand: 0,
    engage_and_lift: 0,
    stabilize_value: 0,
    critical_recovery: 0
  };
  (signals || []).forEach((signal) => {
    const health = String(signal.account?.health?.overall || '').toLowerCase();
    const adoptionGreen = Number(signal.greenUseCaseCount || 0) >= 3;
    const healthy = health === 'green';
    if (healthy && adoptionGreen) bins.scale_and_expand += 1;
    if (healthy && !adoptionGreen) bins.engage_and_lift += 1;
    if (!healthy && adoptionGreen) bins.stabilize_value += 1;
    if (!healthy && !adoptionGreen) bins.critical_recovery += 1;
  });
  return bins;
};

const matrixVisual = (matrix) => `
  <section class="card">
    <div class="metric-head">
      <h2>Health x Adoption Matrix</h2>
      ${statusChip({ label: 'Prioritization', tone: 'neutral' })}
    </div>
    <div class="matrix-grid">
      <article class="matrix-cell matrix-good">
        <h3>Scale & Expand</h3>
        <p>${matrix.scale_and_expand} accounts</p>
        <span>Green health + 3+ green use cases</span>
      </article>
      <article class="matrix-cell matrix-info">
        <h3>Engage & Lift</h3>
        <p>${matrix.engage_and_lift} accounts</p>
        <span>Green health + below 3 green use cases</span>
      </article>
      <article class="matrix-cell matrix-warn">
        <h3>Stabilize Value</h3>
        <p>${matrix.stabilize_value} accounts</p>
        <span>Yellow/Red health + 3+ green use cases</span>
      </article>
      <article class="matrix-cell matrix-risk">
        <h3>Critical Recovery</h3>
        <p>${matrix.critical_recovery} accounts</p>
        <span>Yellow/Red health + below 3 green use cases</span>
      </article>
    </div>
  </section>
`;

const managerSnapshot = (signals = []) => {
  const total = signals.length || 1;
  const adoptionScores = signals.map((signal) => Number(signal.account?.adoption?.platform_adoption_score || 0));
  const avgAdoption = adoptionScores.length
    ? Math.round(adoptionScores.reduce((sum, value) => sum + value, 0) / adoptionScores.length)
    : 0;
  const renewal90 = signals.filter((signal) => Number(signal.renewalDays ?? 999) <= 90).length;
  const noEngagement30 = signals.filter((signal) => Number(signal.touchStaleDays ?? 999) > 30).length;
  const noUpcomingTouch = signals.filter((signal) => !signal.account?.engagement?.next_touch_date).length;
  const healthCounts = {
    green: signals.filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'green').length,
    yellow: signals.filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'yellow').length,
    red: signals.filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'red').length
  };
  const topFocus = [...signals]
    .sort((left, right) => Number(right.outlierScore || 0) - Number(left.outlierScore || 0))
    .slice(0, 5)
    .map((signal) => ({
      id: signal.account.id,
      name: signal.account.name,
      reason: signal.reasons[0] || 'Review adoption + engagement signals.'
    }));

  return {
    total,
    avgAdoption,
    renewal90,
    noEngagement30,
    noUpcomingTouch,
    healthCounts,
    topFocus
  };
};

const managerDashboardCard = (snapshot) => `
  <section class="card">
    <div class="metric-head">
      <h2>Manager Dashboard</h2>
      ${statusChip({ label: `${snapshot.total} accounts`, tone: 'neutral' })}
    </div>
    <div class="kpi-grid kpi-4">
      ${metricTile({ label: 'Avg adoption score', value: snapshot.avgAdoption, tone: snapshot.avgAdoption >= 70 ? 'good' : 'warn' })}
      ${metricTile({ label: 'Renewals < 90d', value: snapshot.renewal90, tone: snapshot.renewal90 > 0 ? 'warn' : 'good' })}
      ${metricTile({ label: 'No engagement > 30d', value: snapshot.noEngagement30, tone: snapshot.noEngagement30 > 0 ? 'risk' : 'good' })}
      ${metricTile({ label: 'Missing next touch', value: snapshot.noUpcomingTouch, tone: snapshot.noUpcomingTouch > 0 ? 'warn' : 'good' })}
    </div>
    <div class="divider"></div>
    <div class="matrix-grid">
      <article class="matrix-cell matrix-good">
        <h3>Healthy</h3>
        <p>${snapshot.healthCounts.green}</p>
        <span>${Math.round((snapshot.healthCounts.green / snapshot.total) * 100)}% of portfolio</span>
      </article>
      <article class="matrix-cell matrix-warn">
        <h3>Attention</h3>
        <p>${snapshot.healthCounts.yellow}</p>
        <span>${Math.round((snapshot.healthCounts.yellow / snapshot.total) * 100)}% of portfolio</span>
      </article>
      <article class="matrix-cell matrix-risk">
        <h3>At Risk</h3>
        <p>${snapshot.healthCounts.red}</p>
        <span>${Math.round((snapshot.healthCounts.red / snapshot.total) * 100)}% of portfolio</span>
      </article>
      <article class="matrix-cell matrix-info">
        <h3>Top Focus Accounts</h3>
        <ul class="simple-list">
          ${
            snapshot.topFocus.length
              ? snapshot.topFocus
                  .map((item) => `<li><a href="#" data-open-account="${item.id}">${item.name}</a> - ${item.reason}</li>`)
                  .join('')
              : '<li>No current focus accounts.</li>'
          }
        </ul>
      </article>
    </div>
  </section>
`;

const buildAmerCompliance = (signals = []) => {
  if (!signals.length) {
    return {
      configured: false,
      checks: []
    };
  }

  const total = signals.length;
  const count = (predicate) => signals.filter(predicate).length;
  return {
    configured: true,
    checks: [
      {
        id: 'cadence-within-30',
        label: 'Cadence within 30 days',
        pass: count((signal) => Number(signal.touchStaleDays ?? 999) <= 30),
        total
      },
      {
        id: 'ebr-scheduled',
        label: 'Next EBR scheduled',
        pass: count((signal) => Boolean(signal.account?.engagement?.next_ebr_date)),
        total
      },
      {
        id: 'workshop-90d',
        label: 'Workshop participation in last 90 days',
        pass: count((signal) => Number(signal.account?.engagement?.program_attendance?.last_90d || 0) > 0),
        total
      },
      {
        id: 'health-freshness',
        label: 'Health updated in last 30 days',
        pass: count((signal) => Number(signal.healthStaleDays ?? 999) <= 30),
        total
      }
    ]
  };
};

const amerComplianceCard = (summary) => {
  if (!summary.configured) {
    return `
      <section class="card">
        <div class="metric-head">
          <h2>AMER Handbook Compliance</h2>
          ${statusChip({ label: 'Not configured', tone: 'missing' })}
        </div>
        <p class="muted">Checks not configured.</p>
        <div class="page-actions">
          <button class="ghost-btn" type="button" data-configure-expectations>Configure expectations</button>
        </div>
      </section>
    `;
  }

  const passed = summary.checks.filter((item) => item.pass === item.total).length;
  return `
    <section class="card">
      <div class="metric-head">
        <h2>AMER Handbook Compliance</h2>
        ${statusChip({ label: `${passed}/${summary.checks.length} checks fully met`, tone: passed === summary.checks.length ? 'good' : 'warn' })}
      </div>
      <ul class="simple-list">
        ${summary.checks
          .map(
            (item) =>
              `<li>${item.label}: <strong>${item.pass}/${item.total}</strong> ${
                item.pass === item.total
                  ? statusChip({ label: 'met', tone: 'good' })
                  : statusChip({ label: 'attention', tone: 'warn' })
              }</li>`
          )
          .join('')}
      </ul>
    </section>
  `;
};

const applyModeDensity = (wrapper, mode) => {
  const normalized = String(mode || 'today').toLowerCase();
  const todayHide = new Set([
    'CSE Operating Loop',
    'Health x Adoption Matrix',
    'Recent Logged Engagements',
    'Program Invitations Needed',
    'Recent Health Changes',
    'Expand & Renew Quick Check',
    'Outcomes Quick Check'
  ]);
  const reviewHide = new Set(['CSE Operating Loop', 'Recent Logged Engagements', 'Program Invitations Needed']);

  const shouldHide = (heading) => {
    if (!heading) return false;
    if (normalized === 'deep') return false;
    if (normalized === 'review') return reviewHide.has(heading);
    return todayHide.has(heading);
  };

  wrapper.querySelectorAll('section.card').forEach((section) => {
    const heading = section.querySelector('h2')?.textContent?.trim();
    section.classList.toggle('is-hidden-mode', shouldHide(heading));
  });
};

const useCaseCoverageAverages = (workspace) => {
  const totals = {
    SCM: 0,
    CICD: 0,
    Security: 0,
    Compliance: 0,
    ReleaseAutomation: 0,
    Observability: 0
  };
  const customers = workspace?.customers || [];
  customers.forEach((customer) => {
    const useCases = workspace?.adoption?.[customer.id]?.useCases || {};
    Object.keys(totals).forEach((key) => {
      totals[key] += Number(useCases[key]?.percent || 0);
    });
  });
  const divisor = Math.max(1, customers.length);
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value / divisor)]));
};

const engagementLabel = (typeKey) => ENGAGEMENT_TYPES[typeKey]?.label || 'On-Demand';
const engagementColor = (typeKey) => ENGAGEMENT_TYPES[typeKey]?.color || '#10b981';
const pteTone = (band) => (String(band) === 'High' ? 'good' : String(band) === 'Medium' ? 'warn' : 'neutral');
const ptcTone = (band) => (String(band) === 'High' ? 'risk' : String(band) === 'Medium' ? 'warn' : 'good');

const normalizeMaturityKey = (value) => {
  const key = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return MATURITY_LEVELS[key] ? key : 'NOT_STARTED';
};

const profileToUseCaseMap = (profile = {}) => ({
  SCM: normalizeMaturityKey(profile.SCM),
  CI: normalizeMaturityKey(profile.CI),
  CD: normalizeMaturityKey(profile.CD),
  DevSecOps: normalizeMaturityKey(profile.DevSecOps),
  'Agile Planning': normalizeMaturityKey(profile['Agile Planning'])
});

const sortByEngagementDate = (rows = []) =>
  [...rows].sort((left, right) => {
    const leftTime = parseDate(left.customer.engagementDate || left.customer.renewalDate || '')?.getTime() || Number.POSITIVE_INFINITY;
    const rightTime = parseDate(right.customer.engagementDate || right.customer.renewalDate || '')?.getTime() || Number.POSITIVE_INFINITY;
    return leftTime - rightTime;
  });

const buildWorkspaceActionQueue = (workspace, rows = []) => {
  const actions = [];
  rows.forEach((row) => {
    const customerId = row.customer.id;
    const customer = row.customer;
    const adoption = workspace?.adoption?.[customerId] || {};
    const useCases = adoption.useCases || {};
    const milestones = adoption.timeToValue || [];
    const firstPipelineDone = milestones.some(
      (item) => String(item.milestone || '').toLowerCase().includes('first pipeline run') && String(item.status || '').toLowerCase() === 'done'
    );
    const topSignal = row.riskSignals?.[0];

    if (topSignal) {
      actions.push({
        id: `risk_${customerId}_${topSignal.code}`,
        customerId,
        customerName: customer.name,
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        pteScore: row.pteScore,
        ptcScore: row.ptcScore,
        reason: topSignal.detail || topSignal.code,
        action: topSignal.code === 'RENEWAL_SOON' ? 'Run renewal readiness playbook and align executive narrative.' : 'Address active risk signal via targeted enablement action.',
        due: customer.renewalDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        severity: topSignal.severity || 'Medium'
      });
    }

    if (Number(useCases.CICD?.percent || 0) < 40) {
      actions.push({
        id: `cicd_${customerId}`,
        customerId,
        customerName: customer.name,
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        pteScore: row.pteScore,
        ptcScore: row.ptcScore,
        reason: `CI/CD adoption is ${Number(useCases.CICD?.percent || 0)}% (<40%)`,
        action: 'Invite to CI/CD Adoption Lab and schedule pipeline template workshop.',
        due: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        severity: 'Medium'
      });
    }

    if (Number(useCases.Security?.percent || 0) < 30) {
      actions.push({
        id: `security_${customerId}`,
        customerId,
        customerName: customer.name,
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        pteScore: row.pteScore,
        ptcScore: row.ptcScore,
        reason: `Security adoption is ${Number(useCases.Security?.percent || 0)}% (<30%)`,
        action: 'Run Secure enablement session and add default scan jobs to pipeline baseline.',
        due: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
        severity: 'Medium'
      });
    }

    if (!firstPipelineDone) {
      actions.push({
        id: `ttv_${customerId}`,
        customerId,
        customerName: customer.name,
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        pteScore: row.pteScore,
        ptcScore: row.ptcScore,
        reason: 'First pipeline run milestone not complete.',
        action: 'Execute time-to-value motion: first pipeline, runner baseline, and owner handoff.',
        due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        severity: 'High'
      });
    }
  });

  return actions
    .sort((left, right) => {
      const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const bySeverity = (severityRank[right.severity] || 1) - (severityRank[left.severity] || 1);
      if (bySeverity) return bySeverity;
      return new Date(left.due || 0).getTime() - new Date(right.due || 0).getTime();
    })
    .slice(0, 12);
};

const renderWorkspaceTodayPage = (ctx) => {
  const {
    workspace,
    workspacePortfolio,
    mode,
    persona,
    filterCount,
    customerSafe,
    maskField,
    navigate,
    setMode,
    onQuickLogEngagement
  } = ctx;
  const rows = sortByEngagementDate(workspacePortfolio?.rows || []);
  const healthDistribution = workspacePortfolio?.healthDistribution || { green: 0, yellow: 0, red: 0 };
  const engagementCoverage = workspacePortfolio?.engagementCoverage || { in30: 0, in60: 0, in90: 0, over90: 0 };
  const useCaseCoverage = useCaseCoverageAverages(workspace);
  const actions = buildWorkspaceActionQueue(workspace, rows);
  const expansionCandidates = rows.filter((row) => Number(row.openExpansionCount || 0) > 0).length;
  const engagementCoveragePercent = rows.length ? Math.round((Number(engagementCoverage.in30 || 0) / rows.length) * 100) : 0;
  const highPteCount = rows.filter((row) => String(row.pteBand) === 'High').length;
  const highPtcCount = rows.filter((row) => String(row.ptcBand) === 'High').length;
  const isManager = persona === 'manager';
  const selectedCustomerId = rows[0]?.customer?.id || '';
  let selectedType = 'ALL';

  const counts = Object.keys(ENGAGEMENT_TYPES).reduce(
    (acc, key) => ({ ...acc, [key]: rows.filter((row) => normalizeEngagementType(row.engagementType) === key).length }),
    {}
  );

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack today-dashboard';
  wrapper.setAttribute('data-page', 'today');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Today</p>
        <h1>Today Console</h1>
        <p class="hero-lede">Portfolio command center for pooled CSE operations: prioritize risk, lift adoption, and prove outcomes.</p>
        <p class="muted page-meta">Focus first on at-risk customers, near-term renewals, and adoption blockers.</p>
      </div>
      <div class="page-actions">
        ${isManager ? '<span class="status-chip tone-info">Manager</span>' : ''}
        <button class="ghost-btn" type="button" data-open-filters aria-expanded="false">Open Filters${
          Number(filterCount || 0) > 0 ? ` (${Number(filterCount)} active)` : ''
        }</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Review Portfolio</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-5">
        ${metricTile({ label: 'Accounts in scope', value: rows.length, tone: 'neutral' })}
        ${metricTile({ label: 'At-risk', value: rows.filter((row) => String(row.health || '').toLowerCase() !== 'green').length, tone: 'risk' })}
        ${metricTile({ label: 'High PtC', value: highPtcCount, tone: highPtcCount ? 'risk' : 'good' })}
        ${metricTile({ label: 'High PtE', value: highPteCount, tone: highPteCount ? 'good' : 'neutral' })}
        ${metricTile({ label: 'Active programs', value: (workspace?.programs || []).length, tone: 'good' })}
        ${metricTile({ label: 'Expansion candidates', value: expansionCandidates, tone: expansionCandidates ? 'warn' : 'neutral' })}
        ${metricTile({ label: 'Engagement coverage 30d', value: `${engagementCoveragePercent}%`, tone: engagementCoveragePercent >= 70 ? 'good' : 'warn' })}
      </div>
    </section>

    ${
      isManager
        ? `<section class="manager-mount" data-manager-overview-mount></section>`
        : ''
    }

    <section class="card dashboard-row-wide ${isManager ? 'is-hidden-mode' : ''}">
      <div class="metric-head">
        <h2>Next Best Actions</h2>
        <div class="page-actions">
          ${statusChip({ label: `${actions.length} prioritized`, tone: actions.length ? 'warn' : 'good' })}
          <button class="ghost-btn" type="button" data-go-playbooks>Open playbooks</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Customer</th><th>Why now</th><th>PtE</th><th>PtC</th><th>Next move</th><th>Due</th><th>Quick actions</th></tr></thead>
          <tbody>
            ${
              actions.length
                ? actions
                    .map(
                      (item) => `
                    <tr>
                      <td><a href="#" data-open-customer="${item.customerId}">${item.customerName}</a></td>
                      <td>${item.reason}</td>
                      <td>${statusChip({ label: `${item.pteScore ?? 0} (${item.pteBand || 'Low'})`, tone: pteTone(item.pteBand) })}</td>
                      <td>${statusChip({ label: `${item.ptcScore ?? 0} (${item.ptcBand || 'Low'})`, tone: ptcTone(item.ptcBand) })}</td>
                      <td>${item.action}</td>
                      <td>${formatDate(item.due)}</td>
                      <td>
                        <div class="page-actions">
                          <button class="ghost-btn" type="button" data-quick-log="${item.customerId}">Log touchpoint</button>
                          <button class="ghost-btn" type="button" data-open-playbooks>Open playbook</button>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join('')
                : '<tr><td colspan="7">No immediate actions generated. Portfolio signals are currently stable.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="dashboard-row-2">
      <article class="card">
        <div class="metric-head">
          <h2>Health Distribution</h2>
          ${statusChip({ label: `${rows.length} customers`, tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${donutChartSvg([
            { label: 'Green', value: healthDistribution.green || 0, color: 'var(--gl-success)' },
            { label: 'Yellow', value: healthDistribution.yellow || 0, color: 'var(--gl-warning)' },
            { label: 'Red', value: healthDistribution.red || 0, color: 'var(--gl-danger)' }
          ])}
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Use Case Adoption Coverage</h2>
          ${statusChip({ label: 'Average percent', tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${barChartSvg([
            { label: 'SCM', value: useCaseCoverage.SCM, color: 'var(--gl-brand-purple)' },
            { label: 'CI/CD', value: useCaseCoverage.CICD, color: 'var(--gl-info)' },
            { label: 'Security', value: useCaseCoverage.Security, color: 'var(--gl-success)' },
            { label: 'Compliance', value: useCaseCoverage.Compliance, color: 'var(--gl-neutral)' },
            { label: 'Release', value: useCaseCoverage.ReleaseAutomation, color: 'var(--gl-warning)' },
            { label: 'Observe', value: useCaseCoverage.Observability, color: 'var(--gl-brand-teal)' }
          ])}
        </div>
      </article>
    </section>

    <section class="dashboard-row-wide">
      <article class="card">
        <div class="metric-head">
          <h2>Engagement Recency Histogram</h2>
          ${statusChip({ label: '0-30 / 31-60 / 61-90 / 90+', tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${barChartSvg([
            { label: '0-30', value: Number(engagementCoverage.in30 || 0), color: 'var(--gl-success)' },
            { label: '31-60', value: Number(engagementCoverage.in60 || 0), color: 'var(--gl-info)' },
            { label: '61-90', value: Number(engagementCoverage.in90 || 0), color: 'var(--gl-warning)' },
            { label: '90+', value: Number(engagementCoverage.over90 || 0), color: 'var(--gl-danger)' }
          ])}
        </div>
      </article>
    </section>

    <section class="card dashboard-row-table">
      <div class="metric-head">
        <h2>Today Engagement Queue</h2>
      </div>
      <div class="engagement-tabbar" role="tablist" aria-label="Engagement type filter">
        <button type="button" class="ghost-btn is-active" data-type-tab="ALL">All (${rows.length})</button>
        ${Object.entries(ENGAGEMENT_TYPES)
          .map(
            ([type, meta]) =>
              `<button type="button" class="ghost-btn" data-type-tab="${type}">${meta.label} (${counts[type] || 0})</button>`
          )
          .join('')}
      </div>
      <div class="table-wrap" data-engagement-table-wrap>
        <table class="data-table">
          <thead><tr><th>Customer</th><th>Engagement Type</th><th>Status</th><th>Date</th><th>Adoption</th><th>PtE</th><th>PtC</th><th>Action</th></tr></thead>
          <tbody data-engagement-queue></tbody>
        </table>
      </div>
      <div data-engagement-empty></div>
    </section>

    ${
      mode === 'review' || mode === 'deep'
        ? `<section class="card"><div data-adoption-widget-mount></div></section>`
        : ''
    }
  `;

  const renderQueue = () => {
    const tbody = wrapper.querySelector('[data-engagement-queue]');
    const tableWrap = wrapper.querySelector('[data-engagement-table-wrap]');
    const emptyHost = wrapper.querySelector('[data-engagement-empty]');
    if (!tbody) return;
    const filteredRows = rows.filter((row) => selectedType === 'ALL' || normalizeEngagementType(row.engagementType) === selectedType);
    if (!filteredRows.length) {
      if (tableWrap) tableWrap.style.display = 'none';
      if (emptyHost) {
        emptyHost.innerHTML = '';
        const empty = selectedType !== 'ALL'
          ? createEmptyState({
              variant: 'filtered',
              title: 'No accounts match your filters',
              body: 'Try adjusting or removing some filters to see more engagement items.',
              actions: [
                {
                  label: 'Clear engagement filter',
                  className: 'qa',
                  onClick: () => {
                    selectedType = 'ALL';
                    wrapper.querySelectorAll('[data-type-tab]').forEach((node) =>
                      node.classList.toggle('is-active', node.getAttribute('data-type-tab') === 'ALL')
                    );
                    renderQueue();
                  }
                }
              ]
            })
          : createEmptyState({
              variant: 'clear',
              title: "You're all caught up for today",
              body: 'No scheduled engagements or pending requests. Check Review mode to plan ahead.',
              actions: [
                {
                  label: 'Go to Review',
                  className: 'ghost-btn',
                  onClick: () => setMode?.('review')
                }
              ]
            });
        emptyHost.appendChild(empty);
      }
      return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyHost) emptyHost.innerHTML = '';
    tbody.innerHTML = filteredRows
      .map((row) => {
        const customerName = maskField?.('accountName', row.customer.name) || row.customer.name;
        const typeKey = normalizeEngagementType(row.engagementType);
        const typeMeta = ENGAGEMENT_TYPES[typeKey] || ENGAGEMENT_TYPES.ON_DEMAND;
        const toneClass =
          typeKey === 'WEBINAR'
            ? 'tag--purple'
            : typeKey === 'OFFICE_HOURS'
              ? 'tag--cyan'
              : typeKey === 'HANDS_ON_LAB'
                ? 'tag--orange'
                : 'tag--green';
        return `
          <tr>
            <td><a href="#" data-open-customer="${row.customer.id}">${customerName}</a></td>
            <td><span class="tag ${toneClass}">${typeMeta.label}</span></td>
            <td>${String(row.engagementStatus || 'REQUESTED').replace(/_/g, ' ')}</td>
            <td>${formatDate(row.engagementDate)}</td>
            <td><div class="adoption-dot-row">${compactAdoptionDots(row.customer.adoptionProfile || {})}</div></td>
            <td>${statusChip({ label: `${row.pteScore ?? 0} (${row.pteBand || 'Low'})`, tone: pteTone(row.pteBand) })}</td>
            <td>${statusChip({ label: `${row.ptcScore ?? 0} (${row.ptcBand || 'Low'})`, tone: ptcTone(row.ptcBand) })}</td>
            <td><button class="ghost-btn" type="button" data-quick-log="${row.customer.id}">Log touchpoint</button></td>
          </tr>
        `;
      })
      .join('');
  };

  renderQueue();

  wrapper.querySelectorAll('[data-type-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedType = button.getAttribute('data-type-tab') || 'ALL';
      wrapper.querySelectorAll('[data-type-tab]').forEach((node) => node.classList.toggle('is-active', node === button));
      renderQueue();
    });
  });

  if (isManager) {
    const mount = wrapper.querySelector('[data-manager-overview-mount]');
    if (mount) {
      mount.appendChild(
        createManagerOverviewPanel({
          workspace,
          portfolioRows: rows,
          maskField,
          customerSafe,
          onOpenCustomer: (customerId) => navigate('customer', { id: customerId })
        })
      );
    }
  }

  if (mode === 'review' || mode === 'deep') {
    const customer = rows.find((row) => row.customer.id === selectedCustomerId)?.customer;
    const adoptionProfile = customer?.adoptionProfile || {};
    const trendPoints = (workspace?.snapshots || []).slice(-4).map((item) => ({
      label: String(item.month || '').slice(5),
      value: Number(item.adoptionAvg || 0)
    }));
    const mount = wrapper.querySelector('[data-adoption-widget-mount]');
    if (mount && customer) {
      mount.appendChild(
        createAdoptionStageWidget({
          accountId: customer.id,
          adoptionProfile,
          customerSafe,
          showTrend: mode === 'deep',
          trendPoints,
          onScheduleEngagement: ({ accountId, recommendation }) => {
            onQuickLogEngagement?.(accountId);
            navigate('playbooks');
          }
        })
      );
    }
  }

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-playbooks]')?.addEventListener('click', () => navigate('playbooks'));

  wrapper.addEventListener('click', (event) => {
    const customerLink = event.target.closest('[data-open-customer]');
    if (customerLink) {
      event.preventDefault();
      navigate('customer', { id: customerLink.getAttribute('data-open-customer') });
      return;
    }
    const logButton = event.target.closest('[data-quick-log]');
    if (logButton) {
      onQuickLogEngagement?.(logButton.getAttribute('data-quick-log'));
      return;
    }
    const playbookButton = event.target.closest('[data-open-playbooks]');
    if (playbookButton) {
      navigate('playbooks');
    }
  });

  applyModeDensity(wrapper, mode);
  return wrapper;
};

export const renderPortfolioHomePage = (ctx) => {
  if ((ctx.workspacePortfolio?.rows || []).length && ctx.workspace) {
    return renderWorkspaceTodayPage(ctx);
  }

  const { portfolio, filters, filterCount, navigate, onLogAttendance, updatedOn, accountLoadError, onRetryData, mode } = ctx;

  const staleThreshold = Number(filters.staleDays || 30);
  const allSignals = [...(portfolio.signals || [])].sort((left, right) => (right.outlierScore || 0) - (left.outlierScore || 0));
  const staleSignals = allSignals.filter((signal) => Number(signal.healthStaleDays || 0) > staleThreshold);
  const overdueQueue = (portfolio.todayQueue || []).filter((item) => Number(item.due_in_days ?? 0) < 0);
  const riskSignals = allSignals.filter(
    (signal) =>
      ['yellow', 'red'].includes(String(signal.account.health?.overall || '').toLowerCase()) || Number(signal.account.adoption?.trend_30d || 0) < 0
  );
  const renewalSignals = allSignals.filter((signal) => Number(signal.renewalDays ?? 999) <= 90);
  const engagementSignals = allSignals.filter(
    (signal) => Number(signal.touchStaleDays || 0) > 30 || !signal.account.engagement?.next_touch_date
  );
  const outcomesSignals = allSignals.filter((signal) => Number(signal.lowestUseCaseScore || 0) < 70 || Number(signal.greenUseCaseCount || 0) < 3);
  const expandRenewSignals = allSignals.filter((signal) => Number(signal.renewalDays ?? 999) <= 180 || Number(signal.greenUseCaseCount || 0) < 3);
  const engagementDue = upcomingEngagements(allSignals, 14);
  const healthChanges = recentHealthChanges(allSignals);
  const programInviteNeeds = allSignals.filter((signal) => signal.recommendedProgram && Number(signal.greenUseCaseCount || 0) < 3);
  const engagementLog = loadEngagementLog();
  const matrix = healthMatrix(allSignals);
  const compliance = buildAmerCompliance(allSignals);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'today');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Today</p>
        <h1>Today Console</h1>
        <p class="hero-lede">Your prioritized CSE operating queue for triage, enablement, and lifecycle progression.</p>
        <p class="muted page-meta">Last updated: ${formatDate(updatedOn)}. Focus first on highest-risk and near-term renewal work.</p>
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-go-intake>Create Engagement Request</button>
        <button class="ghost-btn" type="button" data-open-filters aria-expanded="false">Open Filters${
          Number(filterCount || 0) > 0 ? ` (${Number(filterCount)} active)` : ''
        }</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Review Portfolio</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Priority Items', value: portfolio.todayQueue.length, tone: portfolio.todayQueue.length ? 'warn' : 'good' })}
        ${metricTile({ label: 'Red Accounts', value: portfolio.stats.redAccounts, tone: portfolio.stats.redAccounts ? 'risk' : 'good' })}
        ${metricTile({ label: 'Stale > 30d', value: staleSignals.length, tone: staleSignals.length ? 'warn' : 'good' })}
        ${metricTile({ label: 'Renewal < 90d', value: renewalSignals.length, tone: renewalSignals.length ? 'warn' : 'good' })}
      </div>
      <p class="muted page-meta">Mode behavior: ${String(mode || 'today')}.</p>
    </section>

    ${
      accountLoadError
        ? `<section class="card">
             <div class="metric-head">
               <h2>Account Data Status</h2>
               ${statusChip({ label: 'Load error', tone: 'risk' })}
             </div>
             <p class="muted">Account data failed to load. Retry loading dataset before continuing triage.</p>
             <div class="page-actions">
               <button class="qa" type="button" data-retry-data>Retry</button>
             </div>
           </section>`
        : ''
    }

    ${amerComplianceCard(compliance)}

    ${operatingLoopVisual()}
    ${matrixVisual(matrix)}

    <section class="today-grid">
      <div class="section-stack">
        <section class="card">
          <div class="metric-head">
            <h2>What To Do Next</h2>
            ${statusChip({ label: `${portfolio.todayQueue.length} active`, tone: portfolio.todayQueue.length ? 'warn' : 'good' })}
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Account</th><th>Topic</th><th>Stage</th><th>Due</th><th>Status</th><th>Owner</th></tr></thead>
              <tbody>
                ${portfolio.todayQueue.length ? portfolio.todayQueue.slice(0, 8).map(queueRow).join('') : `<tr><td colspan="6">No queue items due this week.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Due Soon</h2>
            ${statusChip({ label: `${engagementDue.length} upcoming`, tone: engagementDue.length ? 'good' : 'warn' })}
          </div>
          ${renderSignalList(
            engagementDue,
            (signal) =>
              `<a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - next engagement ${formatDate(
                signal.account.engagement?.next_touch_date
              )}, next EBR ${formatDate(signal.account.engagement?.next_ebr_date)}`,
            'No customer engagements due in the next 14 days.'
          )}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Overdue Items</h2>
            ${statusChip({ label: `${overdueQueue.length} overdue`, tone: overdueQueue.length ? 'risk' : 'good' })}
          </div>
          <ul class="simple-list">
            ${
              overdueQueue
                .slice(0, 8)
                .map(
                  (item) =>
                    `<li><a href="#" data-open-account="${item.account_id}">${item.account_name}</a> - ${item.topic} overdue by ${Math.abs(
                      Number(item.due_in_days || 0)
                    )}d</li>`
                )
                .join('') || '<li>No overdue work items.</li>'
            }
          </ul>
        </section>
      </div>

      <div class="section-stack">
        <section class="card">
          <div class="metric-head">
            <h2>Health & Risk Quick Check</h2>
            ${statusChip({ label: `${riskSignals.length} accounts`, tone: riskSignals.length ? 'warn' : 'good' })}
          </div>
          ${renderSignalList(
            riskSignals,
            (signal) =>
              `<a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - ${
                signal.reasons[0] || 'Review account health trend.'
              }`,
            'No yellow/red or negative trend accounts detected.'
          )}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Engagement Quick Check</h2>
            ${statusChip({ label: `${engagementSignals.length} gaps`, tone: engagementSignals.length ? 'warn' : 'good' })}
          </div>
          ${renderSignalList(
            engagementSignals,
            (signal) =>
              `<a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - last touch ${formatDate(
                signal.account.engagement?.last_touch_date
              )}`,
            'No engagement recency gaps.'
          )}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Outcomes Quick Check</h2>
            ${statusChip({ label: `${outcomesSignals.length} attention`, tone: outcomesSignals.length ? 'warn' : 'good' })}
          </div>
          ${renderSignalList(
            outcomesSignals,
            (signal) =>
              `<a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - ${signal.lowestUseCaseName} ${signal.lowestUseCaseScore} (target 75+)`,
            'No outcomes/adoption signals below threshold.'
          )}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Expand & Renew Quick Check</h2>
            ${statusChip({ label: `${expandRenewSignals.length} focus`, tone: expandRenewSignals.length ? 'warn' : 'good' })}
          </div>
          ${renderSignalList(
            expandRenewSignals,
            (signal) =>
              `<a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - renewal ${
                signal.renewalDays ?? 'n/a'
              }d, adoption ${signal.greenUseCaseCount || 0}/4`,
            'No expand/renew accounts need immediate action.'
          )}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Recent Health Changes</h2>
            ${statusChip({ label: `${healthChanges.length} updates`, tone: 'neutral' })}
          </div>
          <ul class="simple-list">
            ${
              healthChanges
                .slice(0, 8)
                .map(
                  (item) =>
                    `<li><a href="#" data-open-account="${item.account.id}">${item.account.name}</a> - ${item.entry.category}: ${item.entry.summary}</li>`
                )
                .join('') || '<li>No recent health changes recorded.</li>'
            }
          </ul>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Recent Logged Engagements</h2>
            ${statusChip({ label: `${engagementLog.length} logged`, tone: 'neutral' })}
          </div>
          <ul class="simple-list">
            ${
              engagementLog
                .slice(0, 8)
                .map(
                  (entry) =>
                    `<li><a href="#" data-open-account="${entry.account_id}">${entry.account_name || entry.account_id}</a> - ${entry.type} on ${formatDate(
                      entry.date
                    )}</li>`
                )
                .join('') || '<li>No engagement events logged yet.</li>'
            }
          </ul>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Program Invitations Needed</h2>
            ${statusChip({ label: `${programInviteNeeds.length} accounts`, tone: programInviteNeeds.length ? 'warn' : 'good' })}
          </div>
          <ul class="simple-list">
            ${
              programInviteNeeds
                .slice(0, 6)
                .map(
                  (signal) =>
                    `<li><a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a> - invite to ${
                      signal.recommendedProgram?.title || 'recommended program'
                    } <button class="ghost-btn" type="button" data-log-attendance="${signal.recommendedProgram?.program_id || ''}">Log attendance</button></li>`
                )
                .join('') || '<li>No pending program invitations.</li>'
            }
          </ul>
        </section>
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-intake]')?.addEventListener('click', () => navigate('intake'));
  wrapper.querySelector('[data-retry-data]')?.addEventListener('click', () => onRetryData?.());
  wrapper.querySelector('[data-configure-expectations]')?.addEventListener('click', () => navigate('playbooks'));

  wrapper.addEventListener('click', (event) => {
    const accountLink = event.target.closest('[data-open-account]');
    if (accountLink) {
      event.preventDefault();
      navigate('account', { id: accountLink.getAttribute('data-open-account') });
      return;
    }

    const attendance = event.target.closest('[data-log-attendance]');
    if (attendance) {
      const programId = attendance.getAttribute('data-log-attendance');
      if (!programId) return;
      onLogAttendance(programId, 1);
    }
  });

  applyModeDensity(wrapper, mode);

  return wrapper;
};

export const renderPortfolioPage = (ctx) => {
  if ((ctx.workspacePortfolio?.rows || []).length && ctx.workspace) {
    const { workspace, workspacePortfolio, filters, onSetFilters, navigate, onExportPortfolio, maskField } = ctx;
    const rows = workspacePortfolio.rows || [];
    const greenUseCaseCount = (customerId) => {
      const useCases = workspace?.adoption?.[customerId]?.useCases || {};
      return Object.values(useCases).filter((item) => Number(item?.percent || 0) >= 75).length;
    };
    const filteredRows = rows.filter((row) => {
      if (filters.health && filters.health !== 'all' && String(row.health || '').toLowerCase() !== String(filters.health || '').toLowerCase()) return false;
      if (filters.pteBand && filters.pteBand !== 'all' && String(row.pteBand || '') !== String(filters.pteBand || '')) return false;
      if (filters.ptcBand && filters.ptcBand !== 'all' && String(row.ptcBand || '') !== String(filters.ptcBand || '')) return false;
      if (filters.renewalWindow === '0-90' && Number(row.renewalDays ?? 999) > 90) return false;
      if (filters.renewalWindow === '91-180' && (Number(row.renewalDays ?? 999) <= 90 || Number(row.renewalDays ?? 999) > 180)) return false;
      if (filters.renewalWindow === '180+' && Number(row.renewalDays ?? 0) <= 180) return false;
      if (filters.staleOnly && Number(row.engagementDays ?? 999) <= 30) return false;
      if (filters.belowThreeGreen && greenUseCaseCount(row.customer.id) >= 3) return false;
      if (Array.isArray(filters.engagementTypes) && filters.engagementTypes.length) {
        const key = normalizeEngagementType(row.engagementType);
        if (!filters.engagementTypes.includes(key)) return false;
      }
      if (Array.isArray(filters.requestedBy) && filters.requestedBy.length) {
        if (!filters.requestedBy.includes(String(row.requestedBy || '').toUpperCase())) return false;
      }
      if (Array.isArray(filters.engagementStatus) && filters.engagementStatus.length) {
        if (!filters.engagementStatus.includes(String(row.engagementStatus || '').toUpperCase())) return false;
      }
      if (filters.adoptionUseCase && filters.adoptionUseCase !== 'all') {
        const profile = profileToUseCaseMap(row.customer?.adoptionProfile || {});
        const maturity = profile[filters.adoptionUseCase] || 'NOT_STARTED';
        if (Array.isArray(filters.adoptionMaturity) && filters.adoptionMaturity.length && !filters.adoptionMaturity.includes(maturity)) {
          return false;
        }
      }
      return true;
    });

    const wrapper = document.createElement('section');
    wrapper.className = 'route-page page-shell section-stack';
    wrapper.setAttribute('data-page', 'portfolio');
    wrapper.innerHTML = `
      <header class="page-head page-intro">
        <div>
          <p class="eyebrow">Portfolio</p>
          <h1>Portfolio Review</h1>
          <p class="hero-lede">Review and prioritize customer coverage by health, adoption depth, engagement recency, and renewal window.</p>
        </div>
        <div class="page-actions">
          <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
          <button class="qa" type="button" data-export-portfolio>Export Portfolio CSV</button>
        </div>
      </header>

      <section class="card">
        <div class="metric-grid kpi-4">
          ${metricTile({ label: 'Customers', value: filteredRows.length, tone: 'neutral' })}
          ${metricTile({ label: 'At-risk', value: filteredRows.filter((row) => String(row.health || '').toLowerCase() !== 'green').length, tone: 'risk' })}
          ${metricTile({ label: 'Renewal < 90d', value: filteredRows.filter((row) => Number(row.renewalDays ?? 999) <= 90).length, tone: 'warn' })}
          ${metricTile({ label: 'Engagement > 30d', value: filteredRows.filter((row) => Number(row.engagementDays ?? 999) > 30).length, tone: 'warn' })}
        </div>
        <div class="divider"></div>
        <div class="filter-row">
          <label>
            Health
            <select data-filter=\"health\">
              <option value=\"all\" ${filters.health === 'all' ? 'selected' : ''}>All</option>
              <option value=\"green\" ${filters.health === 'green' ? 'selected' : ''}>Green</option>
              <option value=\"yellow\" ${filters.health === 'yellow' ? 'selected' : ''}>Yellow</option>
              <option value=\"red\" ${filters.health === 'red' ? 'selected' : ''}>Red</option>
            </select>
          </label>
          <label>
            Renewal Window
            <select data-filter=\"renewalWindow\">
              <option value=\"all\" ${filters.renewalWindow === 'all' ? 'selected' : ''}>All</option>
              <option value=\"0-90\" ${filters.renewalWindow === '0-90' ? 'selected' : ''}>0-90 days</option>
              <option value=\"91-180\" ${filters.renewalWindow === '91-180' ? 'selected' : ''}>91-180 days</option>
              <option value=\"180+\" ${filters.renewalWindow === '180+' ? 'selected' : ''}>180+ days</option>
            </select>
          </label>
          <label>
            PtE Band
            <select data-filter=\"pteBand\">
              <option value=\"all\" ${(filters.pteBand || 'all') === 'all' ? 'selected' : ''}>All</option>
              <option value=\"High\" ${filters.pteBand === 'High' ? 'selected' : ''}>High</option>
              <option value=\"Medium\" ${filters.pteBand === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value=\"Low\" ${filters.pteBand === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </label>
          <label>
            PtC Band
            <select data-filter=\"ptcBand\">
              <option value=\"all\" ${(filters.ptcBand || 'all') === 'all' ? 'selected' : ''}>All</option>
              <option value=\"High\" ${filters.ptcBand === 'High' ? 'selected' : ''}>High</option>
              <option value=\"Medium\" ${filters.ptcBand === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value=\"Low\" ${filters.ptcBand === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </label>
          <label class=\"safe-toggle\">
            <input type=\"checkbox\" data-filter=\"staleOnly\" ${filters.staleOnly ? 'checked' : ''} />
            <span>Stale &gt; 30d</span>
          </label>
          <label class=\"safe-toggle\">
            <input type=\"checkbox\" data-filter=\"belowThreeGreen\" ${filters.belowThreeGreen ? 'checked' : ''} />
            <span>Below 3 green use cases</span>
          </label>
          <label>
            Adoption Use Case
            <select data-filter="adoptionUseCase">
              <option value="all" ${filters.adoptionUseCase === 'all' ? 'selected' : ''}>All</option>
              ${USE_CASES.map((useCase) => `<option value="${useCase}" ${filters.adoptionUseCase === useCase ? 'selected' : ''}>${useCase}</option>`).join('')}
            </select>
          </label>
          <fieldset class="filter-multi">
            <legend>Maturity</legend>
            ${Object.keys(MATURITY_LEVELS)
              .map(
                (key) => `
                <label class="safe-toggle">
                  <input type="checkbox" data-filter-maturity="${key}" ${
                    Array.isArray(filters.adoptionMaturity) && filters.adoptionMaturity.includes(key) ? 'checked' : ''
                  } />
                  <span>${MATURITY_LEVELS[key].label}</span>
                </label>
              `
              )
              .join('')}
          </fieldset>
          <fieldset class="filter-multi">
            <legend>Engagement Type</legend>
            ${Object.keys(ENGAGEMENT_TYPES)
              .map(
                (key) => `
                <label class="safe-toggle">
                  <input type="checkbox" data-filter-engagement-type="${key}" ${
                    Array.isArray(filters.engagementTypes) && filters.engagementTypes.includes(key) ? 'checked' : ''
                  } />
                  <span>${ENGAGEMENT_TYPES[key].label}</span>
                </label>
              `
              )
              .join('')}
          </fieldset>
          <fieldset class="filter-multi">
            <legend>Requested By</legend>
            ${['CSM', 'AE', 'CUSTOMER', 'RENEWAL_MANAGER']
              .map(
                (key) => `
                <label class="safe-toggle">
                  <input type="checkbox" data-filter-requested-by="${key}" ${
                    Array.isArray(filters.requestedBy) && filters.requestedBy.includes(key) ? 'checked' : ''
                  } />
                  <span>${key.replace('_', ' ')}</span>
                </label>
              `
              )
              .join('')}
          </fieldset>
          <fieldset class="filter-multi">
            <legend>Engagement Status</legend>
            ${['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REQUESTED']
              .map(
                (key) => `
                <label class="safe-toggle">
                  <input type="checkbox" data-filter-engagement-status="${key}" ${
                    Array.isArray(filters.engagementStatus) && filters.engagementStatus.includes(key) ? 'checked' : ''
                  } />
                  <span>${key.replace('_', ' ')}</span>
                </label>
              `
              )
              .join('')}
          </fieldset>
        </div>
      </section>

      <section class=\"card\">
        <div class=\"metric-head\">
          <h2>Portfolio Table</h2>
          ${statusChip({ label: `${filteredRows.length} rows`, tone: 'neutral' })}
        </div>
        <div class=\"table-wrap\">
          <table class=\"data-table\">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Tier</th>
                <th>Renewal</th>
                <th>Health</th>
                <th>Adoption</th>
                <th>Engagement</th>
                <th>Risk</th>
                <th>PtE</th>
                <th>PtC</th>
                <th>Propensity drivers</th>
                <th>CI/CD %</th>
                <th>Security %</th>
                <th>Last engagement</th>
                <th>Open expansion</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredRows.length
                  ? filteredRows
                      .map(
                        (row) => `
                      <tr>
                        <td><a href=\"#\" data-open-customer=\"${row.customer.id}\">${maskField?.('accountName', row.customer.name) || row.customer.name}</a></td>
                        <td>${row.customer.tier || 'Standard'}</td>
                        <td>${formatDate(row.customer.renewalDate)}</td>
                        <td>${statusChip({ label: row.health, tone: statusToneFromHealth(row.health) })}</td>
                        <td>${row.adoptionScore}</td>
                        <td>${row.engagementScore}</td>
                        <td>${row.riskScore}</td>
                        <td>${statusChip({ label: `${row.pteScore} (${row.pteBand})`, tone: pteTone(row.pteBand) })}</td>
                        <td>${statusChip({ label: `${row.ptcScore} (${row.ptcBand})`, tone: ptcTone(row.ptcBand) })}</td>
                        <td>${row.pteDriver || 'n/a'} | ${row.ptcDriver || 'n/a'}</td>
                        <td>${row.cicdPercent}%</td>
                        <td>${row.securityPercent}%</td>
                        <td>${formatDate(String(row.lastEngagementDate || '').slice(0, 10))}</td>
                        <td>${row.openExpansionCount}</td>
                      </tr>
                    `
                      )
                      .join('')
                  : '<tr><td colspan=\"14\">No customers match current filters.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>
    `;

    wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
    wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', () => onExportPortfolio?.());
    wrapper.querySelectorAll('[data-filter]').forEach((node) => {
      node.addEventListener('change', (event) => {
        const key = event.target.getAttribute('data-filter');
        if (!key) return;
        if (event.target.type === 'checkbox') {
          onSetFilters?.({ [key]: Boolean(event.target.checked) });
          return;
        }
        onSetFilters?.({ [key]: event.target.value });
      });
    });
    wrapper.querySelectorAll('[data-filter-maturity]').forEach((node) => {
      node.addEventListener('change', () => {
        const selected = [...wrapper.querySelectorAll('[data-filter-maturity]:checked')].map((item) =>
          item.getAttribute('data-filter-maturity')
        );
        onSetFilters?.({ adoptionMaturity: selected });
      });
    });
    wrapper.querySelectorAll('[data-filter-engagement-type]').forEach((node) => {
      node.addEventListener('change', () => {
        const selected = [...wrapper.querySelectorAll('[data-filter-engagement-type]:checked')].map((item) =>
          item.getAttribute('data-filter-engagement-type')
        );
        onSetFilters?.({ engagementTypes: selected });
      });
    });
    wrapper.querySelectorAll('[data-filter-requested-by]').forEach((node) => {
      node.addEventListener('change', () => {
        const selected = [...wrapper.querySelectorAll('[data-filter-requested-by]:checked')].map((item) =>
          item.getAttribute('data-filter-requested-by')
        );
        onSetFilters?.({ requestedBy: selected });
      });
    });
    wrapper.querySelectorAll('[data-filter-engagement-status]').forEach((node) => {
      node.addEventListener('change', () => {
        const selected = [...wrapper.querySelectorAll('[data-filter-engagement-status]:checked')].map((item) =>
          item.getAttribute('data-filter-engagement-status')
        );
        onSetFilters?.({ engagementStatus: selected });
      });
    });
    wrapper.addEventListener('click', (event) => {
      const link = event.target.closest('[data-open-customer]');
      if (!link) return;
      event.preventDefault();
      navigate('customer', { id: link.getAttribute('data-open-customer') });
    });

    return wrapper;
  }

  const { portfolio, filters, onSetFilters, navigate, onExportPortfolio, updatedOn, accountLoadError, onRetryData } = ctx;
  const segments = uniqueSegments(portfolio.signals);
  const lowUseCases = uniqueUseCases(portfolio.signals);
  const staleThreshold = Number(filters.staleDays || 30);
  const filtered = applyPortfolioFilters(portfolio.signals, filters);
  const outlierSignals = applyPortfolioFilters(portfolio.outliers, filters);
  const matrix = healthMatrix(filtered);
  const managerView = managerSnapshot(filtered);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'portfolio');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Portfolio</p>
        <h1>Portfolio View</h1>
        <p class="hero-lede">Pooled coverage view across all accounts with dynamic filtering and outlier prioritization.</p>
        <p class="muted page-meta">Last updated: ${formatDate(updatedOn)}</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
        <button class="qa" type="button" data-export-portfolio>Export Portfolio CSV</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Accounts In View', value: filtered.length, tone: 'neutral' })}
        ${metricTile({ label: 'Red Health', value: filtered.filter((signal) => String(signal.account.health?.overall || '').toLowerCase() === 'red').length, tone: 'risk' })}
        ${metricTile({ label: `Stale > ${staleThreshold}d`, value: filtered.filter((signal) => Number(signal.healthStaleDays || 0) > staleThreshold).length, tone: 'warn' })}
        ${metricTile({ label: 'Below 3 Green', value: filtered.filter((signal) => Number(signal.greenUseCaseCount || 0) < 3).length, tone: 'warn' })}
      </div>
      <div class="divider"></div>
      <div class="filter-row" data-filters-host>
        <label>
          Health
          <select data-filter="health">
            <option value="all" ${filters.health === 'all' ? 'selected' : ''}>All</option>
            <option value="green" ${filters.health === 'green' ? 'selected' : ''}>Green</option>
            <option value="yellow" ${filters.health === 'yellow' ? 'selected' : ''}>Yellow</option>
            <option value="red" ${filters.health === 'red' ? 'selected' : ''}>Red</option>
          </select>
        </label>
        <label>
          Segment
          <select data-filter="segment">
            ${segments.map((segment) => `<option value="${segment}" ${filters.segment === segment ? 'selected' : ''}>${segment}</option>`).join('')}
          </select>
        </label>
        <label>
          Renewal Window
          <select data-filter="renewalWindow">
            <option value="all" ${filters.renewalWindow === 'all' ? 'selected' : ''}>All</option>
            <option value="0-90" ${filters.renewalWindow === '0-90' ? 'selected' : ''}>0-90 days</option>
            <option value="91-180" ${filters.renewalWindow === '91-180' ? 'selected' : ''}>91-180 days</option>
            <option value="180+" ${filters.renewalWindow === '180+' ? 'selected' : ''}>180+ days</option>
          </select>
        </label>
        <label>
          Engagement Recency
          <select data-filter="engagementRecency">
            <option value="all" ${filters.engagementRecency === 'all' ? 'selected' : ''}>All</option>
            <option value="0-14" ${filters.engagementRecency === '0-14' ? 'selected' : ''}>0-14 days</option>
            <option value="15-30" ${filters.engagementRecency === '15-30' ? 'selected' : ''}>15-30 days</option>
            <option value="31+" ${filters.engagementRecency === '31+' ? 'selected' : ''}>31+ days</option>
          </select>
        </label>
        <label>
          Platform Threshold
          <select data-filter="belowThreeGreen">
            <option value="false" ${!filters.belowThreeGreen ? 'selected' : ''}>All</option>
            <option value="true" ${filters.belowThreeGreen ? 'selected' : ''}>Below 3 green</option>
          </select>
        </label>
        <label>
          Stale Threshold
          <select data-filter="staleDays">
            <option value="30" ${Number(filters.staleDays) === 30 ? 'selected' : ''}>30 days</option>
            <option value="45" ${Number(filters.staleDays) === 45 ? 'selected' : ''}>45 days</option>
            <option value="60" ${Number(filters.staleDays) === 60 ? 'selected' : ''}>60 days</option>
          </select>
        </label>
        <label>
          Lowest Use Case
          <select data-filter="lowestUseCase">
            ${lowUseCases.map((name) => `<option value="${name}" ${filters.lowestUseCase === name ? 'selected' : ''}>${name}</option>`).join('')}
          </select>
        </label>
        <label class="safe-toggle">
          <input type="checkbox" data-filter-check="staleOnly" ${filters.staleOnly ? 'checked' : ''} />
          <span>Stale only</span>
        </label>
        <label class="safe-toggle">
          <input type="checkbox" data-filter-check="hasOpenRequest" ${filters.hasOpenRequest ? 'checked' : ''} />
          <span>Has open request</span>
        </label>
      </div>
    </section>

    ${
      accountLoadError
        ? `<section class="card">
             <div class="metric-head">
               <h2>Portfolio Data Error</h2>
               ${statusChip({ label: 'Accounts unavailable', tone: 'risk' })}
             </div>
             <p class="muted">Account data failed to load. Retry to restore portfolio table.</p>
             <button class="qa" type="button" data-retry-data>Retry</button>
           </section>`
        : ''
    }

    ${managerDashboardCard(managerView)}

    ${matrixVisual(matrix)}

    <section>
      <div class="metric-head">
        <h2>Priority Outliers</h2>
        ${statusChip({ label: `${outlierSignals.length} flagged`, tone: outlierSignals.length ? 'risk' : 'good' })}
      </div>
      <div class="grid-3" data-outlier-cards>
        ${
          outlierSignals.length
            ? outlierSignals.slice(0, 9).map((signal) => outlierCard(signal, staleThreshold)).join('')
            : '<p class="empty-text">No outliers match current filters.</p>'
        }
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Accounts Table</h2>
      </div>
      <div data-table-host></div>
    </section>
  `;

  const table = createDataTable({
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'segment', label: 'Segment' },
      { key: 'lifecycle', label: 'Lifecycle Stage' },
      { key: 'health', label: 'Health' },
      { key: 'adoptionCount', label: 'Platform Adoption' },
      { key: 'renewalDays', label: 'Renewal' },
      { key: 'lastTouch', label: 'Last Engagement' },
      { key: 'staleDays', label: 'Staleness' }
    ],
    rows: filtered.map((signal) => ({
      ...signal,
      name: signal.account.name,
      segment: signal.account.segment,
      lifecycle: signal.account.lifecycle_stage || signal.account.health?.lifecycle_stage || 'enable',
      health: signal.account.health?.overall,
      adoptionCount: `${signal.greenUseCaseCount || 0}/4`,
      renewalDays: signal.renewalDays ?? 999,
      lastTouch: signal.account.engagement?.last_touch_date || '',
      staleDays: signal.healthStaleDays ?? 999
    })),
    defaultSort: { key: 'renewalDays', direction: 'asc' },
    rowRenderer: (row) => `
      <td><a href="#" data-open-account="${row.account.id}">${row.account.name}</a></td>
      <td>${row.account.segment}</td>
      <td>${row.account.lifecycle_stage || row.account.health?.lifecycle_stage || 'enable'}</td>
      <td>${statusChip({ label: row.account.health?.overall, tone: statusToneFromHealth(row.account.health?.overall) })}</td>
      <td>${row.greenUseCaseCount || 0}/4 green</td>
      <td>${row.renewalDays === 999 ? 'Not configured' : `${row.renewalDays}d`}</td>
      <td>${formatDate(row.account.engagement?.last_touch_date)}</td>
      <td>${row.healthStaleDays === null ? 'Missing' : `${row.healthStaleDays}d`}</td>
    `
  });
  wrapper.querySelector('[data-table-host]').appendChild(table.element);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-retry-data]')?.addEventListener('click', () => onRetryData?.());

  wrapper.querySelectorAll('[data-filter]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-filter');
      const value =
        key === 'staleDays'
          ? Number(input.value)
          : key === 'belowThreeGreen'
            ? input.value === 'true'
            : input.value;
      onSetFilters({ [key]: value });
    });
  });
  wrapper.querySelectorAll('[data-filter-check]').forEach((input) => {
    input.addEventListener('change', () => onSetFilters({ [input.getAttribute('data-filter-check')]: Boolean(input.checked) }));
  });

  wrapper.addEventListener('click', (event) => {
    const accountLink = event.target.closest('[data-open-account]');
    if (!accountLink) return;
    event.preventDefault();
    navigate('account', { id: accountLink.getAttribute('data-open-account') });
  });

  return wrapper;
};

export const portfolioCommandEntries = (data) => {
  const accountEntries = (data.accounts || []).map((account) => ({
    id: `account-${account.id}`,
    label: `Open account: ${account.name}`,
    meta: `${account.segment}`,
    action: { route: 'account', params: { id: account.id } }
  }));

  return accountEntries;
};
