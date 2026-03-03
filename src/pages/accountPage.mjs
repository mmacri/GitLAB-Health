import { buildCustomerAgenda, buildFollowupEmail, buildIssueBody } from '../lib/artifacts.mjs';
import { formatDate, toIsoDate } from '../lib/date.mjs';
import { redactAccountForCustomer } from '../lib/redaction.mjs';
import { useCaseEntries } from '../lib/scoring.mjs';

const STATUS_TO_TONE = { green: 'good', yellow: 'watch', red: 'risk' };
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'health', label: 'Health & Risk' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'resources', label: 'Resources' },
  { id: 'exports', label: 'Exports' }
];

const toneFor = (value) => STATUS_TO_TONE[String(value || '').toLowerCase()] || 'watch';
const stageLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'Unknown';
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

const summarizeAdoption = (account) => {
  const scores = useCaseEntries(account);
  const green = scores.filter(([, score]) => Number(score) >= 75).length;
  return `${green} of ${scores.length || 4} use cases >= 75`;
};

const adoptionRows = (account) =>
  useCaseEntries(account)
    .map(
      ([name, score]) => `
        <tr>
          <td>${name}</td>
          <td>${score}</td>
          <td><span class="status-pill" data-status="${toneFor(score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red')}">${
        score >= 75 ? 'green' : score >= 60 ? 'yellow' : 'red'
      }</span></td>
        </tr>
      `
    )
    .join('');

const objectiveRows = (account) =>
  (account?.outcomes?.objectives || [])
    .map(
      (objective) => `
      <tr>
        <td>${objective.title}</td>
        <td>${objective.owner}</td>
        <td>${formatDate(objective.due_date)}</td>
        <td><span class="status-pill" data-status="${toneFor(
          objective.status === 'complete' ? 'green' : objective.status === 'at_risk' ? 'red' : 'yellow'
        )}">${objective.status}</span></td>
      </tr>
    `
    )
    .join('');

const requestOptions = (requests) =>
  (requests || [])
    .map(
      (request) =>
        `<option value="${request.request_id}">${request.request_id} | ${request.topic} | due ${formatDate(request.due_date)}</option>`
    )
    .join('');

const artifactCard = (title, key, value) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${title}</h3>
      <button class="ghost-btn" type="button" data-copy-artifact="${key}">Copy</button>
    </div>
    <textarea class="artifact-textarea" readonly data-artifact="${key}">${value || ''}</textarea>
  </article>
`;

const synthRequest = (account, signal) => ({
  request_id: `AUTO-${toIsoDate(new Date())}`,
  account_id: account.id,
  requestor_role: 'Account Executive',
  topic: signal?.suggestedTopic || 'platform foundations',
  stage: account?.health?.lifecycle_stage || 'enable',
  desired_outcome: signal?.playbook?.next_best_action || 'Improve adoption outcomes using pooled CSE program delivery.',
  definition_of_done: 'Agreed use case score target reached and validated with customer sponsor.',
  due_date: account?.engagement?.next_touch_date || toIsoDate(new Date()),
  status: 'new',
  assigned_to: 'CSE Pool',
  notes: 'Auto-generated from account workspace for artifact drafting.'
});

const buildArtifactBundle = (request, account) => ({
  issue: buildIssueBody(request, account),
  agenda: buildCustomerAgenda(request, account),
  email: buildFollowupEmail(request, account)
});

const resourceList = (resources) =>
  (resources || [])
    .map(
      (resource) =>
        `<li><a href="${resource.url}" target="_blank" rel="noopener noreferrer">${resource.title}</a> - ${resource.summary}</li>`
    )
    .join('');

export const renderAccountPage = (ctx) => {
  const {
    workspace,
    resources,
    customerSafe,
    navigate,
    onToggleSafe,
    onCopyInvite,
    onExportAccountCsv,
    onExportAccountPdf,
    copyText,
    notify
  } = ctx;

  if (!workspace?.account) {
    const missing = document.createElement('section');
    missing.className = 'route-page';
    missing.innerHTML = `
      <section class="card">
        <h1>Account not found</h1>
        <p class="muted">The requested account does not exist in current portfolio data.</p>
        <button class="qa" type="button" data-back-portfolio>Back to portfolio</button>
      </section>
    `;
    missing.querySelector('[data-back-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
    return missing;
  }

  const internalAccount = workspace.account;
  const account = customerSafe ? redactAccountForCustomer(internalAccount) : internalAccount;
  const accountResources = (resources || []).filter((resource) => {
    if (customerSafe && !resource.customer_safe) return false;
    return true;
  });

  const openRequests = workspace.openRequests || [];
  const state = {
    selectedRequestId: openRequests[0]?.request_id || null,
    artifacts: buildArtifactBundle(openRequests[0] || synthRequest(account, workspace.signal), account)
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Account Workspace</p>
        <h1>${account.name}</h1>
        <p class="hero-lede">
          Segment ${account.segment} | Renewal ${formatDate(account.renewal_date)} (${workspace.signal?.renewalDays ?? 'TBD'} days) | Health updated ${formatDate(
    account.health?.last_updated
  )}
        </p>
        <div class="chip-row">
          <span class="status-pill" data-status="${toneFor(account.health?.overall)}">Health ${account.health?.overall}</span>
          <span class="status-pill" data-status="${toneFor(account.health?.adoption_health)}">Adoption ${
    account.health?.adoption_health
  }</span>
          <span class="status-pill" data-status="${toneFor(account.health?.engagement_health)}">Engagement ${
    account.health?.engagement_health
  }</span>
          <span class="status-pill" data-status="watch">Stage ${stageLabel(account.health?.lifecycle_stage)}</span>
        </div>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-portfolio>Back to portfolio</button>
        <label class="safe-toggle">
          <input type="checkbox" data-safe-toggle ${customerSafe ? 'checked' : ''} />
          <span>Customer-safe mode</span>
        </label>
      </div>
    </header>

    <div class="workspace-layout">
      <div class="workspace-main">
        <section class="card tabs">
          <nav class="tab-row" aria-label="Account tabs">
            ${TABS.map(
              (tab, index) =>
                `<button class="tab-btn${index === 0 ? ' is-active' : ''}" data-tab="${tab.id}" type="button">${tab.label}</button>`
            ).join('')}
          </nav>

          <div class="tab-panels">
            <section class="tab-panel is-active" data-panel="overview">
              <h2>Overview</h2>
              <p class="muted">
                Health scoring intent combines adoption and engagement signals with lifecycle context. Track all three before deciding next action.
              </p>
              <div class="kpi-grid kpi-4">
                <article class="card compact-card">
                  <h3>Overall health</h3>
                  <p class="stat">${account.health?.overall || 'unknown'}</p>
                </article>
                <article class="card compact-card">
                  <h3>Platform adoption</h3>
                  <p class="stat">${account.adoption?.platform_adoption_score ?? 0}</p>
                  <p class="muted">${account.adoption?.platform_adoption_level || summarizeAdoption(account)}</p>
                </article>
                <article class="card compact-card">
                  <h3>Open requests</h3>
                  <p class="stat">${openRequests.length}</p>
                </article>
                <article class="card compact-card">
                  <h3>Program attendance (90d)</h3>
                  <p class="stat">${account.engagement?.program_attendance?.last_90d ?? 0}</p>
                </article>
              </div>
            </section>

            <section class="tab-panel" data-panel="adoption">
              <h2>Adoption</h2>
              <p class="muted">Platform adoption scoring intent emphasizes depth across multiple use cases; 3+ green signals strong platform value realization.</p>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>Use case</th><th>Score</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${adoptionRows(account)}
                  </tbody>
                </table>
              </div>
              <p class="hint-text">Platform adoption summary: ${summarizeAdoption(account)}.</p>
            </section>

            <section class="tab-panel" data-panel="health">
              <h2>Health & Risk</h2>
              <p class="muted">
                Risk combines lifecycle pressure, stale engagement, and adoption drift. Use pooled programs plus targeted follow-up for at-risk signals.
              </p>
              <ul class="simple-list">
                ${(workspace.signal?.reasons || []).map((reason) => `<li>${reason}</li>`).join('') || '<li>No active risk reasons.</li>'}
              </ul>
              ${
                customerSafe || !internalAccount.internal_only
                  ? ''
                  : `<div class="internal-note">
                      <h3>Internal notes</h3>
                      <p>${internalAccount.internal_only.sentiment_notes || 'No sentiment notes.'}</p>
                      <h4>Expansion hypotheses</h4>
                      <ul class="simple-list">${
                        (internalAccount.internal_only.expansion_hypotheses || []).map((item) => `<li>${item}</li>`).join('') ||
                        '<li>No hypotheses captured.</li>'
                      }</ul>
                    </div>`
              }
            </section>

            <section class="tab-panel" data-panel="outcomes">
              <h2>Outcomes</h2>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>Objective</th><th>Owner</th><th>Due</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    ${objectiveRows(account) || '<tr><td colspan="4">No objectives defined.</td></tr>'}
                  </tbody>
                </table>
              </div>
              <div class="kpi-grid kpi-3">
                <article class="card compact-card">
                  <h3>Time saved (hours)</h3>
                  <p class="stat">${account?.outcomes?.value_metrics?.time_saved_hours ?? 0}</p>
                </article>
                <article class="card compact-card">
                  <h3>Pipeline speed</h3>
                  <p class="muted">${account?.outcomes?.value_metrics?.pipeline_speed || 'Not reported'}</p>
                </article>
                <article class="card compact-card">
                  <h3>Security coverage</h3>
                  <p class="muted">${account?.outcomes?.value_metrics?.security_coverage || 'Not reported'}</p>
                </article>
              </div>
            </section>

            <section class="tab-panel" data-panel="engagement">
              <h2>Engagement</h2>
              <p class="muted">CSE role intent: technical SME execution that converts requests into measurable adoption and customer outcomes.</p>
              <div class="kpi-grid kpi-3">
                <article class="card compact-card">
                  <h3>Last touch</h3>
                  <p class="stat">${formatDate(account.engagement?.last_touch_date)}</p>
                </article>
                <article class="card compact-card">
                  <h3>Next touch</h3>
                  <p class="stat">${formatDate(account.engagement?.next_touch_date)}</p>
                </article>
                <article class="card compact-card">
                  <h3>Programs (90d)</h3>
                  <p class="stat">${account.engagement?.program_attendance?.last_90d ?? 0}</p>
                </article>
              </div>
              <h3>Open requests</h3>
              <ul class="simple-list">
                ${openRequests
                  .map(
                    (request) =>
                      `<li>${request.request_id}: ${request.topic} | ${request.status} | due ${formatDate(request.due_date)} | ${
                        request.assigned_to
                      }</li>`
                  )
                  .join('') || '<li>No open requests.</li>'}
              </ul>
            </section>

            <section class="tab-panel" data-panel="resources">
              <h2>Resources</h2>
              <p class="muted">Handbook resources relevant to pooled delivery, health scoring, and platform adoption scoring.</p>
              <ul class="simple-list">
                ${resourceList(accountResources) || '<li>No resources available for current audience mode.</li>'}
              </ul>
            </section>

            <section class="tab-panel" data-panel="exports">
              <h2>Exports</h2>
              <p class="muted">Customer-safe exports redact internal-only fields. Internal exports include internal notes and escalation context.</p>
              <div class="inline-actions">
                <button class="qa" type="button" data-export-account-csv-safe>Export Account CSV (Customer-safe)</button>
                <button class="ghost-btn" type="button" data-export-account-csv-internal>Export Account CSV (Internal)</button>
                <button class="ghost-btn" type="button" data-export-account-pdf-safe>Export Account Summary PDF (Customer-safe)</button>
                <button class="ghost-btn" type="button" data-export-account-pdf-internal>Export Account Summary PDF (Internal)</button>
              </div>
            </section>
          </div>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Generate Artifacts</h2>
            <span class="status-pill" data-status="watch">Customer-safe outputs</span>
          </div>
          <p class="muted">Generate agenda, follow-up email, and collaboration issue body for the selected request.</p>
          <div class="intake-form">
            <label class="field-span-2">
              <span>Source request</span>
              <select data-request-select>
                ${requestOptions(openRequests)}
              </select>
            </label>
          </div>
          <div class="artifact-grid" data-artifact-grid>
            ${artifactCard('Issue body (GitLab markdown)', 'issue', state.artifacts.issue)}
            ${artifactCard('Customer-safe meeting agenda', 'agenda', state.artifacts.agenda)}
            ${artifactCard('Customer-safe follow-up email', 'email', state.artifacts.email)}
          </div>
        </section>
      </div>

      <aside class="workspace-drawer card">
        <h2>Action Drawer</h2>
        <p><strong>Lifecycle stage:</strong> ${stageLabel(workspace.lifecycleStage)}</p>
        <p><strong>Next best action:</strong> ${workspace.nextBestAction}</p>
        <p><strong>Why flagged:</strong> ${(workspace.signal?.reasons || []).slice(0, 2).join(' | ') || 'No active flags'}</p>
        <h3>Open requests + owner</h3>
        <ul class="simple-list">
          ${openRequests
            .map((request) => `<li>${request.request_id} - ${request.assigned_to || 'Unassigned'}</li>`)
            .join('') || '<li>No open requests.</li>'}
        </ul>
        <h3>Recommended 1:many program</h3>
        ${
          workspace.recommendedProgram
            ? `<p><strong>${workspace.recommendedProgram.title}</strong> (${workspace.recommendedProgram.type})</p>
               <p class="muted">${formatDate(workspace.recommendedProgram.date)}</p>
               <button class="ghost-btn" type="button" data-copy-invite="${workspace.recommendedProgram.program_id}">Copy invite blurb</button>`
            : '<p class="muted">No program recommendation available.</p>'
        }
      </aside>
    </div>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-safe-toggle]')?.addEventListener('change', (event) => onToggleSafe(Boolean(event.target.checked)));

  wrapper.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-tab');
      wrapper.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('is-active', item === button));
      wrapper
        .querySelectorAll('[data-panel]')
        .forEach((panel) => panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target));
    });
  });

  wrapper.querySelector('[data-request-select]')?.addEventListener('change', (event) => {
    state.selectedRequestId = event.target.value;
    const request = openRequests.find((item) => item.request_id === state.selectedRequestId) || synthRequest(account, workspace.signal);
    state.artifacts = buildArtifactBundle(request, account);
    wrapper.querySelector('[data-artifact-grid]').innerHTML = `
      ${artifactCard('Issue body (GitLab markdown)', 'issue', state.artifacts.issue)}
      ${artifactCard('Customer-safe meeting agenda', 'agenda', state.artifacts.agenda)}
      ${artifactCard('Customer-safe follow-up email', 'email', state.artifacts.email)}
    `;
  });

  wrapper.addEventListener('click', (event) => {
    const copyAction = event.target.closest('[data-copy-artifact]');
    if (copyAction) {
      const key = copyAction.getAttribute('data-copy-artifact');
      const value = state.artifacts?.[key];
      if (!value) return;
      copyText(value).then(() => notify(`${key} copied.`));
      return;
    }

    const invite = event.target.closest('[data-copy-invite]');
    if (invite) {
      onCopyInvite(invite.getAttribute('data-copy-invite'));
      return;
    }

    if (event.target.closest('[data-export-account-csv-safe]')) {
      onExportAccountCsv(internalAccount, { customerSafe: true });
      return;
    }
    if (event.target.closest('[data-export-account-csv-internal]')) {
      onExportAccountCsv(internalAccount, { customerSafe: false });
      return;
    }
    if (event.target.closest('[data-export-account-pdf-safe]')) {
      onExportAccountPdf(internalAccount, { customerSafe: true });
      return;
    }
    if (event.target.closest('[data-export-account-pdf-internal]')) {
      onExportAccountPdf(internalAccount, { customerSafe: false });
    }
  });

  return wrapper;
};

export const accountCommandEntries = (workspace) => {
  if (!workspace?.account) return [];
  return [
    {
      id: 'account-overview',
      label: `Account overview: ${workspace.account.name}`,
      meta: 'Account',
      action: { route: 'account', params: { id: workspace.account.id } }
    },
    {
      id: 'account-programs',
      label: 'Open programs',
      meta: 'Programs',
      action: { route: 'programs' }
    }
  ];
};
