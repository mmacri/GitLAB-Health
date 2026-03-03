import { renderActionDrawer } from '../components/actionDrawer.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { wireTabs } from '../components/tabs.js';
import { buildCustomerAgenda, buildFollowupEmail, buildIssueBody } from '../lib/artifacts.js';
import { daysUntil, formatDate, isMissing } from '../lib/date.js';
import { redactAccountForCustomer } from '../lib/redaction.js';
import { useCaseEntries } from '../lib/scoring.js';

const TAB_DEFS = [
  { id: 'snapshot', label: 'Snapshot', anchor: 'overview' },
  { id: 'adoption', label: 'Adoption', anchor: 'adoption' },
  { id: 'health', label: 'Health & Risk', anchor: 'health-risk' },
  { id: 'outcomes', label: 'Outcomes', anchor: 'outcomes' },
  { id: 'engagement', label: 'Engagement', anchor: 'engagement' },
  { id: 'journey', label: 'Journey', anchor: 'journey' },
  { id: 'resources', label: 'Resources', anchor: 'resources' },
  { id: 'cheatsheet', label: 'Cheatsheet', anchor: 'cheatsheet' }
];

const toPercent = (value) => `${Math.max(0, Math.min(100, Math.round(Number(value) || 0)))}%`;

const scoreTone = (score) => {
  if (Number(score) >= 75) return 'good';
  if (Number(score) >= 60) return 'warn';
  return 'risk';
};

const freshnessChip = (days) => {
  if (days === null || days === undefined) return statusChip({ label: 'Missing', tone: 'missing' });
  if (days > 10) return statusChip({ label: `${days}d stale`, tone: 'stale' });
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

const timelineRows = (account) =>
  (account?.journey?.milestones || [])
    .map(
      (item) => `
      <div class="timeline-item">
        <strong>${item.label}</strong>
        <span>${item.actual_days} days (target ${item.target_days})</span>
        ${statusChip({ label: item.status, tone: item.status === 'done' ? 'good' : item.status === 'watch' ? 'warn' : 'risk' })}
      </div>
    `
    )
    .join('');

const requestOptions = (openRequests) =>
  openRequests
    .map((item) => `<option value="${item.request_id}">${item.request_id} | ${item.topic} | due ${formatDate(item.due_date)}</option>`)
    .join('');

const resourceRows = (resources) =>
  resources
    .map((resource) => `<li><a href="${resource.url}" target="_blank" rel="noopener noreferrer">${resource.title}</a> - ${resource.summary}</li>`)
    .join('');

export const renderAccountPage = (ctx) => {
  const {
    workspace,
    resources,
    customerSafe,
    mode,
    navigate,
    onToggleSafe,
    onCopyInvite,
    onExportAccountCsv,
    onExportAccountPdf,
    onOpenMissingEditor,
    copyText,
    notify
  } = ctx;

  if (!workspace?.account) {
    const missing = document.createElement('section');
    missing.className = 'route-page';
    missing.innerHTML = `
      <section class="card">
        <h1>Account not found</h1>
        <p class="muted">No account matches this route.</p>
        <button class="qa" type="button" data-back-home>Back to portfolio</button>
      </section>
    `;
    missing.querySelector('[data-back-home]')?.addEventListener('click', () => navigate('home'));
    return missing;
  }

  const internalAccount = workspace.account;
  const account = customerSafe ? redactAccountForCustomer(internalAccount) : internalAccount;
  const allResources = (resources || []).filter((item) => (customerSafe ? item.customer_safe : true));
  const openRequests = workspace.openRequests || [];

  const licenseUtilization = Math.min(96, Math.max(22, Math.round((Number(account.adoption?.platform_adoption_score || 0) * 0.72) + 18)));
  const freshnessDays = workspace.signal?.healthStaleDays;
  const renewalDays = workspace.signal?.renewalDays;
  const artifactSource = openRequests[0] || {
    request_id: 'AUTO-ACCOUNT',
    account_id: account.id,
    requestor_role: 'Account Executive',
    topic: workspace.signal?.suggestedTopic || 'platform foundations',
    stage: account.health?.lifecycle_stage,
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
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head" id="today-console">
      <div>
        <p class="eyebrow">Account Workspace</p>
        <h1>${account.name}</h1>
        <p class="hero-lede">Segment ${account.segment} | Renewal in ${renewalDays ?? 'Missing data'} days | Stage ${account.health?.lifecycle_stage}</p>
        <div class="chip-row">
          ${statusChip({ label: `Health ${account.health?.overall}`, tone: statusToneFromHealth(account.health?.overall) })}
          ${statusChip({ label: `Adoption ${account.health?.adoption_health}`, tone: statusToneFromHealth(account.health?.adoption_health) })}
          ${statusChip({ label: `Engagement ${account.health?.engagement_health}`, tone: statusToneFromHealth(account.health?.engagement_health) })}
          ${freshnessChip(freshnessDays)}
        </div>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
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
      ${metricTile({ label: 'Data freshness', value: freshnessDays === null ? 'Missing data' : `${freshnessDays}d`, meta: account.health?.last_updated || 'No update date', tone: freshnessDays > 10 ? 'warn' : 'good', tooltip: 'Stale means health update older than 10 days.' })}
    </section>

    <section class="workspace-layout">
      <nav class="secondary-nav card" aria-label="Account section navigation">
        ${TAB_DEFS.map((tab) => `<a href="#${tab.anchor}" data-tab-link="${tab.id}">${tab.label}</a>`).join('')}
      </nav>

      <div class="tabs card" data-tabs>
        <div class="tab-row">
          ${TAB_DEFS.map((tab, index) => `<button type="button" class="tab-btn${index === 0 ? ' is-active' : ''}" data-tab-target="${tab.id}" aria-selected="${index === 0 ? 'true' : 'false'}">${tab.label}</button>`).join('')}
        </div>

        <section class="tab-panel is-active" data-tab-panel="snapshot" id="overview" aria-hidden="false">
          <div class="metric-head"><h2>Snapshot</h2>${statusChip({ label: mode, tone: 'neutral' })}</div>
          <div class="callout">Next best action: ${workspace.nextBestAction}</div>
          <div class="card compact-card">
            <h3>Missing data fields</h3>
            <ul class="simple-list">
              <li>Last updated: ${missingEditable('Last updated', 'health.last_updated', account.health?.last_updated, 'date')}</li>
              <li>Next touch: ${missingEditable('Next touch', 'engagement.next_touch_date', account.engagement?.next_touch_date, 'date')}</li>
              <li>Pipeline speed: ${missingEditable('Pipeline speed', 'outcomes.value_metrics.pipeline_speed', account.outcomes?.value_metrics?.pipeline_speed, 'text')}</li>
            </ul>
          </div>
          <div class="card compact-card" id="today">
            <h3>Today Focus</h3>
            <ul class="simple-list">
              ${workspace.actions.immediate.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="adoption" id="adoption" aria-hidden="true">
          <div class="metric-head"><h2>Adoption</h2></div>
          <p class="muted">Platform adoption scoring: 3+ green use cases indicates healthy depth and value realization.</p>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Use case</th><th>Score</th><th>Status</th><th>Recommendation</th></tr></thead>
              <tbody>${useCaseRows(account)}</tbody>
            </table>
          </div>
          <div class="callout">Recommended workshop: ${workspace.recommendedProgram?.title || 'Select based on lowest use-case score.'}</div>
        </section>

        <section class="tab-panel" data-tab-panel="health" id="health-risk" aria-hidden="true">
          <div class="metric-head"><h2>Health & Risk</h2></div>
          <p class="muted">Health rubric combines adoption, engagement, and lifecycle signals.</p>
          <ul class="simple-list">
            ${(workspace.signal?.reasons || []).map((reason) => `<li>${reason}</li>`).join('') || '<li>No active risk factors.</li>'}
          </ul>
          ${
            customerSafe
              ? ''
              : `<div class="card compact-card">
                  <h3>Internal risk register</h3>
                  <p class="muted">${internalAccount.internal_only?.sentiment_notes || 'No internal notes.'}</p>
                  <ul class="simple-list">
                    ${(internalAccount.internal_only?.escalations || [])
                      .map((item) => `<li>${item.severity}: ${item.issue} (next update ${formatDate(item.next_update_due)})</li>`)
                      .join('') || '<li>No escalations.</li>'}
                  </ul>
                </div>`
          }
        </section>

        <section class="tab-panel" data-tab-panel="outcomes" id="outcomes" aria-hidden="true">
          <div class="metric-head"><h2>Outcomes</h2></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Objective</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>${outcomeRows(account)}</tbody>
            </table>
          </div>
          <div class="kpi-grid kpi-3">
            ${metricTile({ label: 'Time saved', value: account.outcomes?.value_metrics?.time_saved_hours || 'Missing data', meta: 'hours', tone: 'good' })}
            ${metricTile({ label: 'Pipeline speed', value: account.outcomes?.value_metrics?.pipeline_speed || 'Missing data', tone: isMissing(account.outcomes?.value_metrics?.pipeline_speed) ? 'warn' : 'good' })}
            ${metricTile({ label: 'Security coverage', value: account.outcomes?.value_metrics?.security_coverage || 'Missing data', tone: 'neutral' })}
          </div>
        </section>

        <section class="tab-panel" data-tab-panel="engagement" id="engagement" aria-hidden="true">
          <div class="metric-head"><h2>Engagement</h2></div>
          <div class="kpi-grid kpi-3">
            ${metricTile({ label: 'Cadence', value: account.engagement?.cadence || 'Missing data', tone: 'neutral' })}
            ${metricTile({ label: 'Last touch', value: account.engagement?.last_touch_date || 'Missing data', tone: 'neutral' })}
            ${metricTile({ label: 'Next touch', value: account.engagement?.next_touch_date || 'Missing data', tone: isMissing(account.engagement?.next_touch_date) ? 'warn' : 'good' })}
          </div>
          <h3>Open requests</h3>
          <ul class="simple-list">
            ${openRequests
              .map((request) => `<li>${request.request_id} | ${request.topic} | ${request.status} | due ${formatDate(request.due_date)}</li>`)
              .join('') || '<li>No open requests.</li>'}
          </ul>
        </section>

        <section class="tab-panel" data-tab-panel="journey" id="journey" aria-hidden="true">
          <div class="metric-head"><h2>Journey</h2></div>
          <div class="timeline">${timelineRows(account)}</div>
        </section>

        <section class="tab-panel" data-tab-panel="resources" id="resources" aria-hidden="true">
          <div class="metric-head"><h2>Resources</h2></div>
          <ul class="simple-list">${resourceRows(allResources) || '<li>No resources available.</li>'}</ul>
        </section>

        <section class="tab-panel" data-tab-panel="cheatsheet" id="cheatsheet" aria-hidden="true">
          <div class="metric-head"><h2>Cheatsheet</h2></div>
          <div class="callout">Do this next: align objective + done criteria, route to pooled program, capture adoption delta, update renewal narrative.</div>
          <section class="card compact-card">
            <h3>Generate artifacts</h3>
            <label>
              Source request
              <select data-request-select>${requestOptions(openRequests)}</select>
            </label>
            <div class="artifact-grid" data-artifact-grid>
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
    title: 'Account Action Drawer',
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

  wrapper.querySelectorAll('[data-tab-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const id = link.getAttribute('data-tab-link');
      const tabBtn = wrapper.querySelector(`[data-tab-target="${id}"]`);
      tabBtn?.click();
      wrapper.querySelectorAll('[data-tab-link]').forEach((item) => item.classList.remove('is-active'));
      link.classList.add('is-active');
    });
  });

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

  wrapper.querySelector('[data-copy-invite]')?.addEventListener('click', () => onCopyInvite(workspace.recommendedProgram?.program_id));

  return wrapper;
};

export const accountCommandEntries = (workspace) => {
  if (!workspace?.account) return [];
  return [
    { id: `account-${workspace.account.id}`, label: `Open account: ${workspace.account.name}`, meta: 'Account', action: { route: 'account', params: { id: workspace.account.id } } },
    { id: 'account-programs', label: 'Open programs', meta: 'Programs', action: { route: 'programs' } },
    { id: 'account-exports', label: 'Open exports center', meta: 'Exports', action: { route: 'exports' } }
  ];
};
