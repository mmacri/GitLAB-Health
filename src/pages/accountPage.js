import { renderActionDrawer } from '../components/actionDrawer.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { wireTabs } from '../components/tabs.js';
import { buildCustomerAgenda, buildFollowupEmail, buildIssueBody } from '../lib/artifacts.js';
import { formatDate, isMissing, toIsoDate } from '../lib/date.js';
import { listEngagementEventsForAccount } from '../lib/engagementLog.js';
import { redactAccountForCustomer } from '../lib/redaction.js';
import { useCaseEntries } from '../lib/scoring.js';

const TAB_DEFS = [
  { id: 'summary', label: 'Summary', anchor: 'summary' },
  { id: 'journey', label: 'Journey', anchor: 'journey' },
  { id: 'adoption', label: 'Adoption', anchor: 'adoption' },
  { id: 'health', label: 'Health & Risk', anchor: 'health-risk' },
  { id: 'engagement', label: 'Engagement', anchor: 'engagement' },
  { id: 'outcomes', label: 'Outcomes', anchor: 'outcomes' },
  { id: 'exports', label: 'Exports', anchor: 'exports' }
];

const STAGE_ORDER = ['align', 'onboard', 'enable', 'expand', 'renew'];
const STAGE_LABELS = {
  align: 'Align',
  onboard: 'Onboard',
  enable: 'Enable',
  expand: 'Expand',
  renew: 'Renew'
};

const toPercent = (value) => `${Math.max(0, Math.min(100, Math.round(Number(value) || 0)))}%`;

const scoreTone = (score) => {
  if (Number(score) >= 75) return 'good';
  if (Number(score) >= 60) return 'warn';
  return 'risk';
};

const freshnessChip = (days) => {
  if (days === null || days === undefined) return statusChip({ label: 'Missing', tone: 'missing' });
  if (days > 30) return statusChip({ label: `${days}d stale`, tone: 'stale' });
  return statusChip({ label: 'Fresh', tone: 'good' });
};

const missingEditable = (label, path, value, type = 'text') => {
  if (!isMissing(value)) return `<span>${value}</span>`;
  return `
    <span class="missing-field">
      ${statusChip({ label: 'Missing data', tone: 'missing' })}
      <button class="ghost-btn" type="button" data-edit-missing="${path}" data-edit-label="${label}" data-edit-type="${type}">Add/update</button>
    </span>
  `;
};

const buildArtifactSet = (request, account) => ({
  issue: buildIssueBody(request, account),
  agenda: buildCustomerAgenda(request, account),
  email: buildFollowupEmail(request, account)
});

const useCaseRows = (account) =>
  useCaseEntries(account)
    .map(
      ([name, score]) => `
        <tr>
          <td>${name}</td>
          <td>${score}</td>
          <td>${statusChip({ label: Number(score) >= 75 ? 'green' : Number(score) >= 60 ? 'yellow' : 'red', tone: scoreTone(score) })}</td>
          <td>${Number(score) < 70 ? 'Recommended workshop' : 'Maintain and expand'}</td>
        </tr>
      `
    )
    .join('');

const outcomeRows = (account) =>
  (account?.outcomes?.objectives || [])
    .map(
      (objective) => `
        <tr>
          <td>${objective.title}</td>
          <td>${objective.owner}</td>
          <td>${formatDate(objective.due_date)}</td>
          <td>${statusChip({ label: objective.status, tone: objective.status === 'complete' ? 'good' : objective.status === 'at_risk' ? 'risk' : 'warn' })}</td>
        </tr>
      `
    )
    .join('');

const requestOptions = (openRequests) =>
  openRequests
    .map((item) => `<option value="${item.request_id}">${item.request_id} | ${item.topic} | due ${formatDate(item.due_date)}</option>`)
    .join('');

const buildPathToGreen = (account) => {
  const entries = useCaseEntries(account);
  const greenCount = entries.filter(([, score]) => Number(score) >= 75).length;
  if (greenCount >= 3) {
    return ['Maintain 3+ green use cases with quarterly evidence updates.'];
  }

  return entries
    .filter(([, score]) => Number(score) < 75)
    .sort((left, right) => Number(left[1]) - Number(right[1]))
    .slice(0, 3)
    .map(([name, score]) => `Lift ${name} from ${score} to 75+ through targeted workshop + follow-up evidence.`);
};

const buildAdoptionLandingZone = (account, workspace, pathToGreen) => {
  const objectiveTitles = (account?.outcomes?.objectives || [])
    .map((objective) => objective?.title)
    .filter(Boolean)
    .slice(0, 3);
  const lowestUseCase = workspace?.signal?.lowestUseCaseName || 'Secure';
  const lowestScore = Number(workspace?.signal?.lowestUseCaseScore || 0);
  const riskDrivers = (workspace?.signal?.reasons || []).slice(0, 3);
  const recommendedProgram = workspace?.recommendedProgram?.title || 'Targeted use-case acceleration workshop';
  const renewalDays = Number(workspace?.signal?.renewalDays ?? 999);
  const nextTouch = account?.engagement?.next_touch_date || 'Not configured';

  return {
    topGoals: objectiveTitles.length
      ? objectiveTitles
      : [
          `Improve ${lowestUseCase} adoption from ${lowestScore} toward 75+ threshold`,
          'Increase verified platform value evidence for executive reviews',
          'Sustain 30-day adoption growth without engagement gaps'
        ],
    requiredTasks: [
      ...pathToGreen.slice(0, 2),
      `Schedule next enablement touchpoint (currently ${nextTouch}).`
    ],
    risks: riskDrivers.length
      ? riskDrivers
      : [
          'No current risk drivers logged; validate risk register at next review.',
          'Confirm renewal stakeholders have latest value narrative.',
          'Validate data freshness before executive summary export.'
        ],
    workshops: [
      recommendedProgram,
      `Focused ${lowestUseCase} office hours for technical unblock`,
      'Executive outcomes readout session'
    ],
    successCriteria: [
      'Reach and maintain 3+ green use cases',
      'Close at least one at-risk objective before next review cycle',
      renewalDays <= 120
        ? 'Complete renewal readiness evidence pack before renewal committee checkpoint'
        : 'Maintain monthly outcome evidence updates tied to success plan'
    ]
  };
};

const lifecycleFlowDiagram = () => `
  <svg class="lifecycle-svg" viewBox="0 0 980 210" role="img" aria-label="Lifecycle flow from kickoff to renewal">
    <defs>
      <linearGradient id="flowLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0284c7"></stop>
        <stop offset="100%" stop-color="#6e49cb"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="980" height="210" rx="14" fill="#f8fafc" stroke="#e5e7eb"></rect>
    <line x1="90" y1="110" x2="890" y2="110" stroke="url(#flowLine)" stroke-width="8" stroke-linecap="round"></line>
    <g>
      <circle cx="110" cy="110" r="24" fill="#e0f2fe" stroke="#0284c7"></circle>
      <text x="110" y="115" text-anchor="middle" font-size="12" fill="#0f172a">1</text>
      <text x="110" y="154" text-anchor="middle" font-size="13" fill="#111827">Kickoff</text>
    </g>
    <g>
      <circle cx="300" cy="110" r="24" fill="#dcfce7" stroke="#16a34a"></circle>
      <text x="300" y="115" text-anchor="middle" font-size="12" fill="#0f172a">2</text>
      <text x="300" y="154" text-anchor="middle" font-size="13" fill="#111827">Onboarding</text>
    </g>
    <g>
      <circle cx="490" cy="110" r="24" fill="#dbeafe" stroke="#2563eb"></circle>
      <text x="490" y="115" text-anchor="middle" font-size="12" fill="#0f172a">3</text>
      <text x="490" y="154" text-anchor="middle" font-size="13" fill="#111827">First Value</text>
    </g>
    <g>
      <circle cx="680" cy="110" r="24" fill="#ede9fe" stroke="#6e49cb"></circle>
      <text x="680" y="115" text-anchor="middle" font-size="12" fill="#0f172a">4</text>
      <text x="680" y="154" text-anchor="middle" font-size="13" fill="#111827">Expansion</text>
    </g>
    <g>
      <circle cx="870" cy="110" r="24" fill="#ffedd5" stroke="#d97706"></circle>
      <text x="870" y="115" text-anchor="middle" font-size="12" fill="#0f172a">5</text>
      <text x="870" y="154" text-anchor="middle" font-size="13" fill="#111827">Renewal</text>
    </g>
  </svg>
`;

const buildChangeLog = (account, workspace, engagementEvents = []) => {
  const loggerEntries = (engagementEvents || []).map((item) => ({
    date: item.date,
    category: 'Engagement',
    summary: `${item.type}: ${item.notes_customer_safe || 'Engagement logged.'}`
  }));
  const explicitLog = Array.isArray(account.change_log) ? account.change_log : [];
  if (explicitLog.length) {
    return [...loggerEntries, ...explicitLog]
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .slice(0, 40);
  }

  const completeObjectives = (account.outcomes?.objectives || []).filter((item) => item.status === 'complete').length;
  const trend = Number(account.adoption?.trend_30d || 0);

  return [
    ...loggerEntries,
    {
      date: account.health?.last_updated || account.engagement?.last_touch_date || '',
      category: 'Usage',
      summary: trend >= 0 ? `Platform usage trend +${trend}% over 30 days.` : `Platform usage trend ${trend}% over 30 days.`
    },
    {
      date: account.engagement?.last_touch_date || '',
      category: 'Engagement',
      summary: `Last touch ${formatDate(account.engagement?.last_touch_date)}; next touch ${formatDate(account.engagement?.next_touch_date)}.`
    },
    {
      date: account.health?.last_updated || '',
      category: 'Risk',
      summary: workspace.signal?.reasons?.[0] || 'No new risks flagged in current review cycle.'
    },
    {
      date: account.health?.last_updated || '',
      category: 'Outcomes',
      summary: `${completeObjectives} objective(s) validated complete in the current cycle.`
    }
  ];
};

const changeLogRows = (items) =>
  (items || [])
    .map(
      (item) => `
        <div class="timeline-item">
          <strong>${item.category}</strong>
          <span>${item.summary}</span>
          ${statusChip({ label: formatDate(item.date), tone: 'neutral' })}
        </div>
      `
    )
    .join('');

const yellowResponseSummary = (workspace, account) =>
  [
    `Account: ${account.name}`,
    `Lifecycle stage: ${account.lifecycle_stage || account.health?.lifecycle_stage}`,
    `Top drivers: ${(workspace.signal?.reasons || []).slice(0, 3).join('; ') || 'No active drivers'}`,
    `Next best action: ${workspace.nextBestAction}`,
    `Program recommendation: ${workspace.recommendedProgram?.title || 'Select based on lowest use case score'}`
  ].join('\n');

const healthComponents = (account, workspace) => {
  const objectives = account?.outcomes?.objectives || [];
  const completeObjectives = objectives.filter((item) => item.status === 'complete').length;
  const objectiveRatio = objectives.length ? completeObjectives / objectives.length : 0;
  const touchDays = Number(workspace?.signal?.touchStaleDays ?? 30);
  const attendance = Number(account?.engagement?.program_attendance?.last_90d || 0);
  const trend = Number(account?.adoption?.trend_30d || 0);
  const overall = String(account?.health?.overall || '').toLowerCase();
  const riskScore = overall === 'red' ? 44 : overall === 'yellow' ? 63 : 82;
  const voiceScore = overall === 'red' ? 48 : overall === 'yellow' ? 67 : 80;
  const engagementScore = Math.max(35, Math.min(95, 85 - touchDays + attendance * 2));

  return [
    {
      key: 'Product',
      weight: 35,
      score: Number(account?.adoption?.platform_adoption_score || 0),
      trend,
      tooltip: 'Adoption depth and platform use-case coverage.'
    },
    {
      key: 'Risk',
      weight: 20,
      score: riskScore,
      trend: trend < 0 ? trend : 0,
      tooltip: 'Lifecycle and renewal risk posture.'
    },
    {
      key: 'Outcomes',
      weight: 20,
      score: Math.round(objectiveRatio * 100),
      trend: completeObjectives ? 3 : -2,
      tooltip: 'Progress against agreed customer outcomes.'
    },
    {
      key: 'Voice',
      weight: 10,
      score: voiceScore,
      trend: overall === 'green' ? 2 : -1,
      tooltip: 'Customer sentiment and confidence signals.'
    },
    {
      key: 'Engagement',
      weight: 15,
      score: Math.round(engagementScore),
      trend: touchDays <= 14 ? 2 : -2,
      tooltip: 'Cadence recency and enablement participation.'
    }
  ];
};

const weightedHealthScore = (components) => {
  const totalWeight = components.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (!totalWeight) return 0;
  return Math.round(
    components.reduce((sum, item) => sum + (Number(item.score || 0) * Number(item.weight || 0)) / totalWeight, 0)
  );
};

const normalizedStage = (stage) => {
  const value = String(stage || '').trim().toLowerCase();
  if (value === 'optimize') return 'expand';
  return value || 'enable';
};

const lifecycleStageProgress = (stage) => {
  const current = normalizedStage(stage);
  const currentIndex = Math.max(0, STAGE_ORDER.indexOf(current));
  return {
    current,
    currentIndex,
    percent: Math.round((currentIndex / (STAGE_ORDER.length - 1)) * 100)
  };
};

export const renderAccountPage = (ctx) => {
  const {
    workspace,
    customerSafe,
    mode,
    navigate,
    onToggleSafe,
    onCopyInvite,
    onExportAccountCsv,
    onExportAccountPdf,
    onOpenMissingEditor,
    onLogEngagement,
    copyText,
    notify,
    journeyMode = false
  } = ctx;

  if (!workspace?.account) {
    const missing = document.createElement('section');
    missing.className = 'route-page';
    missing.innerHTML = `
      <section class="card">
        <h1>Account not found</h1>
        <p class="muted">No account matches this route.</p>
        <button class="qa" type="button" data-back-home>Back to work queue</button>
      </section>
    `;
    missing.querySelector('[data-back-home]')?.addEventListener('click', () => navigate('home'));
    return missing;
  }

  const internalAccount = workspace.account;
  const account = customerSafe ? redactAccountForCustomer(internalAccount) : internalAccount;
  const openRequests = workspace.openRequests || [];
  const engagementEvents = listEngagementEventsForAccount(internalAccount.id, { customerSafe });
  const changeLog = buildChangeLog(account, workspace, engagementEvents);
  const pathToGreen = buildPathToGreen(account);
  const drivers = (workspace.signal?.reasons || []).slice(0, 3);
  const lowestUseCase = workspace.signal?.lowestUseCaseName || 'SCM';
  const lowestScore = workspace.signal?.lowestUseCaseScore ?? 0;
  const lifecycleStage = account.lifecycle_stage || account.health?.lifecycle_stage || 'enable';
  const healthRubric = healthComponents(account, workspace);
  const healthScore = weightedHealthScore(healthRubric);
  const completeObjectives = (account.outcomes?.objectives || []).filter((item) => item.status === 'complete').length;
  const renewalReadiness = Math.max(0, Math.min(100, Math.round((healthScore * 0.5) + (completeObjectives * 15) + (workspace.signal?.renewalDays <= 90 ? -10 : 10))));
  const executiveSummary =
    account.outcomes?.executive_summary ||
    `Platform adoption is ${account.adoption?.platform_adoption_level || 'not yet established'}. Focus remains on ${lowestUseCase} uplift and evidence capture before renewal.`;
  const validationStatus =
    account.outcomes?.validation_status || (completeObjectives > 0 ? 'customer confirmed' : 'internal estimate');
  const engagementNotes = changeLog.filter((item) => item.category === 'Engagement').slice(0, 3);
  const timelineEvents = changeLog.filter((item) => ['Engagement', 'Usage', 'Outcomes'].includes(item.category));
  const lifecycle = lifecycleStageProgress(lifecycleStage);
  const startTab = journeyMode ? 'journey' : 'summary';
  const adoptionLanding = buildAdoptionLandingZone(account, workspace, pathToGreen);

  const licenseUtilization = Math.min(96, Math.max(22, Math.round((Number(account.adoption?.platform_adoption_score || 0) * 0.72) + 18)));
  const freshnessDays = workspace.signal?.healthStaleDays;
  const renewalDays = workspace.signal?.renewalDays;
  const artifactSource = openRequests[0] || {
    request_id: 'AUTO-ACCOUNT',
    account_id: account.id,
    requestor_role: 'Account Executive',
    topic: workspace.signal?.suggestedTopic || 'platform foundations',
    stage: lifecycleStage,
    desired_outcome: workspace.nextBestAction,
    definition_of_done: 'Measurable adoption and outcome signal improved',
    due_date: account.engagement?.next_touch_date || account.renewal_date,
    status: 'new',
    assigned_to: 'CSE Pool',
    notes: 'Generated from account workspace'
  };

  const state = {
    selectedRequestId: artifactSource.request_id,
    artifacts: buildArtifactSet(artifactSource, account)
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.innerHTML = `
    <header class="page-head account-header" id="today-console">
      <div>
        <p class="eyebrow">Account Workspace</p>
        <h1>${account.name}</h1>
        <p class="hero-lede">Segment ${account.segment} | Renewal in ${renewalDays ?? 'Missing data'} days | Stage ${lifecycleStage}</p>
        <div class="lifecycle-progress">
          <div class="lifecycle-track" aria-hidden="true">
            <span style="width:${lifecycle.percent}%"></span>
          </div>
          <div class="lifecycle-steps">
            ${STAGE_ORDER.map((stage, index) => `<span class="lifecycle-step${index <= lifecycle.currentIndex ? ' is-done' : ''}${stage === lifecycle.current ? ' is-current' : ''}">${STAGE_LABELS[stage]}</span>`).join('')}
          </div>
        </div>
        <div class="chip-row">
          ${statusChip({ label: `Health ${account.health?.overall}`, tone: statusToneFromHealth(account.health?.overall) })}
          ${statusChip({ label: `Adoption ${account.health?.adoption_health}`, tone: statusToneFromHealth(account.health?.adoption_health) })}
          ${statusChip({ label: `Engagement ${account.health?.engagement_health}`, tone: statusToneFromHealth(account.health?.engagement_health) })}
          ${statusChip({ label: `Platform ${workspace.signal?.greenUseCaseCount || 0}/4 green`, tone: (workspace.signal?.greenUseCaseCount || 0) >= 3 ? 'good' : 'warn' })}
          ${freshnessChip(freshnessDays)}
        </div>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
        <button class="ghost-btn" type="button" data-header-export-customer-csv>Customer-safe CSV</button>
        <button class="ghost-btn" type="button" data-header-export-customer-pdf>Customer-safe PDF</button>
        <label class="safe-toggle">
          <input type="checkbox" data-safe-toggle ${customerSafe ? 'checked' : ''} />
          <span>Customer-safe</span>
        </label>
      </div>
    </header>

    <section class="snapshot-bar card">
      ${metricTile({ label: 'Health score', value: account.adoption?.platform_adoption_score || 0, meta: account.health?.overall, tone: statusToneFromHealth(account.health?.overall), tooltip: 'Health score reflects adoption + engagement + lifecycle signals.' })}
      ${metricTile({ label: 'Platform adoption', value: account.adoption?.platform_adoption_level || 'Missing data', meta: 'Target 3+ green use cases', tone: scoreTone(account.adoption?.platform_adoption_score), tooltip: '3+ green use cases indicates healthy platform depth.' })}
      ${metricTile({ label: 'License utilization', value: toPercent(licenseUtilization), meta: 'Sample benchmark metric', tone: licenseUtilization >= 70 ? 'good' : licenseUtilization >= 50 ? 'warn' : 'risk' })}
      ${metricTile({ label: 'Renewal countdown', value: renewalDays ?? 'Missing data', meta: 'days', tone: renewalDays <= 90 ? 'risk' : renewalDays <= 180 ? 'warn' : 'good' })}
      ${metricTile({ label: 'Data freshness', value: freshnessDays === null ? 'Missing data' : `${freshnessDays}d`, meta: account.health?.last_updated || 'No update date', tone: freshnessDays > 30 ? 'warn' : 'good', tooltip: 'Stale means health update older than 30 days.' })}
    </section>

    <section class="workspace-layout">
      <div class="tabs card" data-tabs>
        <div class="tab-row">
          ${TAB_DEFS.map((tab) => `<button type="button" class="tab-btn${tab.id === startTab ? ' is-active' : ''}" data-tab-target="${tab.id}" aria-selected="${tab.id === startTab ? 'true' : 'false'}">${tab.label}</button>`).join('')}
        </div>

        <section class="tab-panel${startTab === 'summary' ? ' is-active' : ''}" data-tab-panel="summary" id="summary" aria-hidden="${startTab === 'summary' ? 'false' : 'true'}">
          <div class="metric-head"><h2>Summary</h2>${statusChip({ label: mode, tone: 'neutral' })}</div>
          <div class="callout">Next best action: ${workspace.nextBestAction}</div>

          <div class="kpi-grid kpi-3">
            ${metricTile({ label: 'Renewal readiness', value: `${renewalReadiness}%`, tone: renewalReadiness >= 75 ? 'good' : renewalReadiness >= 60 ? 'warn' : 'risk' })}
            ${metricTile({ label: 'Top health drivers', value: drivers.length || 0, meta: 'active signals', tone: drivers.length ? 'warn' : 'good' })}
            ${metricTile({ label: 'Staleness', value: freshnessDays === null ? 'Missing' : `${freshnessDays} days`, meta: freshnessDays > 30 ? 'Needs update' : 'Current', tone: freshnessDays > 30 ? 'warn' : 'good' })}
          </div>

          <div class="card compact-card">
            <h3>What Changed</h3>
            <div class="timeline">${changeLogRows(changeLog)}</div>
          </div>

          <div class="card compact-card">
            <h3>Top 3 Health Drivers</h3>
            <ul class="simple-list">
              ${drivers.map((item) => `<li>${item}</li>`).join('') || '<li>No active risk drivers.</li>'}
            </ul>
          </div>

          <div class="card compact-card">
            <h3>Immediate Actions</h3>
            <ul class="simple-list">
              ${workspace.actions.immediate.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </div>

          <div class="card compact-card">
            <h3>Missing Data</h3>
            <ul class="simple-list">
              <li>Last updated: ${missingEditable('Last updated', 'health.last_updated', account.health?.last_updated, 'date')}</li>
              <li>Next touch: ${missingEditable('Next touch', 'engagement.next_touch_date', account.engagement?.next_touch_date, 'date')}</li>
              <li>Pipeline speed: ${missingEditable('Pipeline speed', 'outcomes.value_metrics.pipeline_speed', account.outcomes?.value_metrics?.pipeline_speed, 'text')}</li>
            </ul>
          </div>
        </section>

        <section class="tab-panel${startTab === 'journey' ? ' is-active' : ''}" data-tab-panel="journey" id="journey" aria-hidden="${startTab === 'journey' ? 'false' : 'true'}">
          <div class="metric-head"><h2>Journey</h2>${statusChip({ label: STAGE_LABELS[lifecycle.current] || 'Enable', tone: 'neutral' })}</div>
          <div class="callout">
            Lifecycle progression follows Align -> Onboard -> Enable -> Expand -> Renew. Current stage: <strong>${STAGE_LABELS[lifecycle.current] || 'Enable'}</strong>.
          </div>
          <div class="card compact-card">
            <h3>Cheatsheet: Lifecycle Flow Diagram</h3>
            <p class="muted">Use this visual in CSE reviews to align customer teams on lifecycle progression.</p>
            ${lifecycleFlowDiagram()}
          </div>
          <div class="card compact-card">
            <h3>Customer Success Journey Stages</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Stage</th><th>Goal</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td>Align</td><td>Define success plan, outcomes, and executive sponsors.</td><td>${statusChip({ label: lifecycle.currentIndex >= 0 ? 'done' : 'pending', tone: lifecycle.currentIndex >= 0 ? 'good' : 'warn' })}</td></tr>
                  <tr><td>Onboard</td><td>Complete onboarding milestones and first value readiness.</td><td>${statusChip({ label: lifecycle.currentIndex >= 1 ? 'done' : 'pending', tone: lifecycle.currentIndex >= 1 ? 'good' : 'warn' })}</td></tr>
                  <tr><td>Enable</td><td>Drive workshops, labs, and technical enablement motions.</td><td>${statusChip({ label: lifecycle.currentIndex >= 2 ? 'active' : 'pending', tone: lifecycle.currentIndex >= 2 ? 'good' : 'warn' })}</td></tr>
                  <tr><td>Expand</td><td>Increase platform adoption depth and validated outcomes.</td><td>${statusChip({ label: lifecycle.currentIndex >= 3 ? 'active' : 'pending', tone: lifecycle.currentIndex >= 3 ? 'good' : 'warn' })}</td></tr>
                  <tr><td>Renew</td><td>Show value narrative and renewal readiness evidence.</td><td>${statusChip({ label: lifecycle.currentIndex >= 4 ? 'active' : 'upcoming', tone: lifecycle.currentIndex >= 4 ? 'good' : 'neutral' })}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card compact-card">
            <h3>Success Plan Tracking</h3>
            <ul class="simple-list">
              ${(
                account.outcomes?.objectives || []
              )
                .map((objective) => `<li>${objective.title} - ${statusChip({ label: objective.status, tone: objective.status === 'complete' ? 'good' : objective.status === 'at_risk' ? 'risk' : 'warn' })}</li>`)
                .join('') || '<li>No success plan objectives defined.</li>'}
            </ul>
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="adoption" id="adoption" aria-hidden="true">
          <div class="metric-head"><h2>Adoption</h2></div>
          <div class="callout">
            Platform adoption success is 3+ green use cases. Lowest use case today: <strong>${lowestUseCase} (${lowestScore})</strong>.
          </div>
          <div class="card compact-card">
            <h3>Adoption Landing Zone</h3>
            <div class="landing-grid">
              <article>
                <h4>Top goals</h4>
                <ul class="simple-list">${adoptionLanding.topGoals.map((item) => `<li>${item}</li>`).join('')}</ul>
              </article>
              <article>
                <h4>Required tasks</h4>
                <ul class="simple-list">${adoptionLanding.requiredTasks.map((item) => `<li>${item}</li>`).join('')}</ul>
              </article>
              <article>
                <h4>Risks to watch</h4>
                <ul class="simple-list">${adoptionLanding.risks.map((item) => `<li>${item}</li>`).join('')}</ul>
              </article>
              <article>
                <h4>Recommended workshops</h4>
                <ul class="simple-list">${adoptionLanding.workshops.map((item) => `<li>${item}</li>`).join('')}</ul>
              </article>
              <article>
                <h4>Success criteria</h4>
                <ul class="simple-list">${adoptionLanding.successCriteria.map((item) => `<li>${item}</li>`).join('')}</ul>
              </article>
            </div>
          </div>
          <div class="card compact-card">
            <h3>Path to 3+ Green</h3>
            <ul class="simple-list">
              ${pathToGreen.map((step) => `<li>${step}</li>`).join('')}
            </ul>
          </div>
          <div class="card compact-card">
            <h3>Recommended Workshop</h3>
            <p class="muted">${workspace.recommendedProgram?.title || 'Select based on lowest use-case score.'}</p>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Use case</th><th>Score</th><th>Status</th><th>Recommendation</th></tr></thead>
              <tbody>${useCaseRows(account)}</tbody>
            </table>
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="health" id="health-risk" aria-hidden="true">
          <div class="metric-head"><h2>Health & Risk</h2></div>
          <p class="muted">Weighted health scoring combines Product, Risk, Outcomes, Voice, and Engagement signals.</p>
          <div class="kpi-grid kpi-3">
            ${healthRubric
              .map(
                (item) =>
                  metricTile({
                    label: `${item.key} (${item.weight}%)`,
                    value: `${item.score}`,
                    meta: item.trend >= 0 ? `Trend +${item.trend}` : `Trend ${item.trend}`,
                    tone: scoreTone(item.score),
                    tooltip: item.tooltip
                  })
              )
              .join('')}
          </div>
          <div class="callout">
            Weighted score: <strong>${healthScore}</strong>. Health semantics: green = stable, yellow = attention, red = risk.
          </div>
          <div class="card compact-card">
            <h3>Top Drivers</h3>
            <ul class="simple-list">
              ${drivers.map((item) => `<li>${item}</li>`).join('') || '<li>No active risk drivers.</li>'}
            </ul>
          </div>
          <div class="card compact-card">
            <h3>Mitigation Steps</h3>
            <ul class="simple-list">
              ${drivers
                .map((item, index) => `<li>Step ${index + 1}: Assign owner, define done criteria, and update by next touchpoint for "${item}".</li>`)
                .join('') || '<li>No mitigation actions needed.</li>'}
            </ul>
          </div>
          <div class="card compact-card">
            <h3>Yellow Response Summary</h3>
            <p class="muted">Customer-safe summary for alignment and follow-up.</p>
            <button class="ghost-btn" type="button" data-copy-yellow-summary>Copy summary</button>
          </div>
          ${
            customerSafe
              ? ''
              : `<div class="card compact-card">
                  <h3>Internal Risk Register</h3>
                  <p class="muted">${internalAccount.internal_only?.sentiment_notes || 'No internal notes.'}</p>
                  <div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Severity</th><th>Issue</th><th>Next Update</th></tr></thead>
                      <tbody>
                        ${
                          (internalAccount.internal_only?.escalations || [])
                            .map((item) => `<tr><td>${item.severity}</td><td>${item.issue}</td><td>${formatDate(item.next_update_due)}</td></tr>`)
                            .join('') || '<tr><td colspan="3">No escalations.</td></tr>'
                        }
                      </tbody>
                    </table>
                  </div>
                </div>`
          }
        </section>

        <section class="tab-panel" data-tab-panel="engagement" id="engagement" aria-hidden="true">
          <div class="metric-head">
            <h2>Engagement</h2>
            <button class="ghost-btn" type="button" data-log-engagement>Log engagement touchpoint</button>
          </div>
          <div class="kpi-grid kpi-3">
            ${metricTile({ label: 'Cadence', value: account.engagement?.cadence || 'Missing data', tone: 'neutral' })}
            ${metricTile({ label: 'Last touch', value: account.engagement?.last_touch_date || 'Missing data', tone: 'neutral' })}
            ${metricTile({ label: 'Next touch', value: account.engagement?.next_touch_date || 'Missing data', tone: isMissing(account.engagement?.next_touch_date) ? 'warn' : 'good' })}
          </div>
          <div class="card compact-card">
            <h3>Program Participation (90d)</h3>
            <ul class="simple-list">
              <li>Total attendance: ${account.engagement?.program_attendance?.last_90d ?? 0}</li>
              <li>Webinars: ${account.engagement?.program_attendance?.webinars ?? 0}</li>
              <li>Labs: ${account.engagement?.program_attendance?.labs ?? 0}</li>
              <li>Office hours: ${account.engagement?.program_attendance?.office_hours ?? 0}</li>
            </ul>
            <button class="ghost-btn" type="button" data-copy-program-invite ${workspace.recommendedProgram ? '' : 'disabled'}>Copy recommended invite</button>
          </div>
          <div class="card compact-card">
            <h3>Open Requests</h3>
            <ul class="simple-list">
              ${
                openRequests
                  .map((request) => `<li>${request.request_id} | ${request.topic} | ${request.status} | due ${formatDate(request.due_date)}</li>`)
                  .join('') || '<li>No open requests.</li>'
              }
            </ul>
          </div>
          <div class="card compact-card">
            <h3>Meeting Notes Summary</h3>
            <ul class="simple-list">
              ${
                engagementNotes
                  .map((item) => `<li>${formatDate(item.date)} - ${item.summary}</li>`)
                  .join('') || '<li>No recent engagement notes.</li>'
              }
            </ul>
          </div>
          <div class="card compact-card">
            <h3>Engagement Timeline</h3>
            <div class="timeline">
              ${changeLogRows(timelineEvents)}
            </div>
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="outcomes" id="outcomes" aria-hidden="true">
          <div class="metric-head"><h2>Outcomes</h2></div>
          <div class="card compact-card">
            <h3>Narrative Executive Summary</h3>
            <p class="muted">${executiveSummary}</p>
            <p class="muted">Validation status: ${statusChip({ label: validationStatus, tone: validationStatus === 'customer confirmed' ? 'good' : 'warn' })}</p>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Objective</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>${outcomeRows(account)}</tbody>
            </table>
          </div>
          <div class="card compact-card">
            <h3>Success Plan Milestones</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Milestone</th><th>Target</th><th>Actual</th><th>Status</th></tr></thead>
                <tbody>
                  ${
                    (account.journey?.milestones || [])
                      .map(
                        (milestone) =>
                          `<tr><td>${milestone.label}</td><td>${milestone.target_days}d</td><td>${milestone.actual_days}d</td><td>${statusChip({ label: milestone.status, tone: milestone.status === 'done' ? 'good' : milestone.status === 'watch' ? 'warn' : 'risk' })}</td></tr>`
                      )
                      .join('') || '<tr><td colspan="4">No milestones captured.</td></tr>'
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="kpi-grid kpi-3">
            ${metricTile({ label: 'Time saved', value: account.outcomes?.value_metrics?.time_saved_hours || 'Missing data', meta: 'hours', tone: 'good' })}
            ${metricTile({ label: 'Pipeline speed', value: account.outcomes?.value_metrics?.pipeline_speed || 'Missing data', tone: isMissing(account.outcomes?.value_metrics?.pipeline_speed) ? 'warn' : 'good' })}
            ${metricTile({ label: 'Security coverage', value: account.outcomes?.value_metrics?.security_coverage || 'Missing data', tone: 'neutral' })}
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="exports" id="exports" aria-hidden="true">
          <div class="metric-head"><h2>Exports</h2></div>
          <div class="page-actions">
            <button class="qa" type="button" data-export-customer-csv>Export Customer-safe CSV</button>
            <button class="ghost-btn" type="button" data-export-internal-csv>Export Internal CSV</button>
            <button class="qa" type="button" data-export-customer-pdf>Export Customer-safe Summary</button>
            <button class="ghost-btn" type="button" data-export-internal-pdf>Export Internal Summary</button>
          </div>
          <section class="card compact-card">
            <h3>Generate Artifacts</h3>
            <label>
              Source request
              <select data-request-select>${requestOptions(openRequests)}</select>
            </label>
            <div class="artifact-grid">
              <article class="card compact-card">
                <div class="metric-head"><h3>Issue body</h3><button class="ghost-btn" type="button" data-copy-artifact="issue">Copy</button></div>
                <textarea class="artifact" readonly data-artifact="issue">${state.artifacts.issue}</textarea>
              </article>
              <article class="card compact-card">
                <div class="metric-head"><h3>Meeting agenda</h3><button class="ghost-btn" type="button" data-copy-artifact="agenda">Copy</button></div>
                <textarea class="artifact" readonly data-artifact="agenda">${state.artifacts.agenda}</textarea>
              </article>
              <article class="card compact-card">
                <div class="metric-head"><h3>Follow-up email</h3><button class="ghost-btn" type="button" data-copy-artifact="email">Copy</button></div>
                <textarea class="artifact" readonly data-artifact="email">${state.artifacts.email}</textarea>
              </article>
            </div>
          </section>
        </section>
      </div>

      <div data-drawer-host></div>
    </section>
  `;

  wireTabs(wrapper);

  const drawer = renderActionDrawer({
    title: journeyMode ? 'Journey Action Drawer' : 'Account Action Drawer',
    mode,
    nextActions: workspace.actions.immediate,
    dueSoon: workspace.actions.dueSoon,
    riskSignals: workspace.actions.strategic,
    onGenerateAgenda: async () => {
      await copyText(state.artifacts.agenda);
      notify('Agenda copied.');
    },
    onGenerateEmail: async () => {
      await copyText(state.artifacts.email);
      notify('Follow-up email copied.');
    },
    onGenerateIssue: async () => {
      await copyText(state.artifacts.issue);
      notify('Issue body copied.');
    },
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => onExportAccountCsv(internalAccount, { customerSafe }),
    onExportSummary: () => onExportAccountPdf(internalAccount, { customerSafe })
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-safe-toggle]')?.addEventListener('change', (event) => onToggleSafe(Boolean(event.target.checked)));
  wrapper.querySelector('[data-header-export-customer-csv]')?.addEventListener('click', () => onExportAccountCsv(internalAccount, { customerSafe: true }));
  wrapper.querySelector('[data-header-export-customer-pdf]')?.addEventListener('click', () => onExportAccountPdf(internalAccount, { customerSafe: true }));

  wrapper.querySelectorAll('[data-copy-artifact]').forEach((button) => {
    button.addEventListener('click', async () => {
      const key = button.getAttribute('data-copy-artifact');
      const text = state.artifacts[key];
      if (!text) return;
      await copyText(text);
      notify(`${key} copied.`);
    });
  });

  wrapper.querySelector('[data-request-select]')?.addEventListener('change', (event) => {
    const requestId = event.target.value;
    const selected = openRequests.find((item) => item.request_id === requestId) || artifactSource;
    state.artifacts = buildArtifactSet(selected, account);
    wrapper.querySelector('[data-artifact="issue"]').value = state.artifacts.issue;
    wrapper.querySelector('[data-artifact="agenda"]').value = state.artifacts.agenda;
    wrapper.querySelector('[data-artifact="email"]').value = state.artifacts.email;
  });

  wrapper.querySelectorAll('[data-edit-missing]').forEach((button) => {
    button.addEventListener('click', () => {
      onOpenMissingEditor({
        accountId: internalAccount.id,
        path: button.getAttribute('data-edit-missing'),
        label: button.getAttribute('data-edit-label'),
        type: button.getAttribute('data-edit-type') || 'text'
      });
    });
  });

  wrapper.querySelector('[data-copy-program-invite]')?.addEventListener('click', () => {
    if (!workspace.recommendedProgram?.program_id) return;
    onCopyInvite(workspace.recommendedProgram.program_id);
  });

  wrapper.querySelector('[data-copy-yellow-summary]')?.addEventListener('click', async () => {
    await copyText(yellowResponseSummary(workspace, account));
    notify('Health response summary copied.');
  });

  wrapper.querySelector('[data-log-engagement]')?.addEventListener('click', () => {
    onLogEngagement?.(internalAccount.id, `Manual engagement touchpoint logged on ${toIsoDate(new Date())}.`);
    notify('Engagement touchpoint logged.');
  });

  wrapper.querySelector('[data-export-customer-csv]')?.addEventListener('click', () => onExportAccountCsv(internalAccount, { customerSafe: true }));
  wrapper.querySelector('[data-export-internal-csv]')?.addEventListener('click', () => onExportAccountCsv(internalAccount, { customerSafe: false }));
  wrapper.querySelector('[data-export-customer-pdf]')?.addEventListener('click', () => onExportAccountPdf(internalAccount, { customerSafe: true }));
  wrapper.querySelector('[data-export-internal-pdf]')?.addEventListener('click', () => onExportAccountPdf(internalAccount, { customerSafe: false }));

  return wrapper;
};

export const accountCommandEntries = (workspace) => {
  if (!workspace?.account) return [];
  return [
    { id: `account-${workspace.account.id}`, label: `Open account: ${workspace.account.name}`, meta: 'Account', action: { route: 'account', params: { id: workspace.account.id } } },
    { id: `journey-${workspace.account.id}`, label: `Open journey: ${workspace.account.name}`, meta: 'Journey', action: { route: 'journey', params: { id: workspace.account.id } } },
    { id: 'account-programs', label: 'Open programs', meta: 'Programs', action: { route: 'programs' } },
    { id: 'account-exports', label: 'Open exports center', meta: 'Exports', action: { route: 'exports' } }
  ];
};
