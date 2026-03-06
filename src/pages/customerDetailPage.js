import { pageHeader } from '../components/pageHeader.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { metricTile } from '../components/metricTile.js';
import { wireTabs } from '../components/tabs.js';
import { formatDate } from '../lib/date.js';
import { DEVSECOPS_STAGES, STAGE_STATUSES, USE_CASE_KEYS } from '../lib/model.js';

const engagementTypes = ['Workshop', 'Webinar', '1:many', '1:1', 'Office Hours', 'Executive Briefing', 'Cadence Call'];
const expansionStatuses = ['Open', 'Validating', 'Proposed', 'Won', 'Closed'];
const vocStatuses = ['Captured', 'In Review', 'Planned', 'Shipped', 'Closed'];
const riskSeverities = ['Low', 'Medium', 'High', 'Critical'];
const healthOptions = ['Auto', 'Green', 'Yellow', 'Red'];

const normalize = (value) => String(value || '').trim().toLowerCase();

const toPercent = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const sortByDateDesc = (items = [], key = 'ts') =>
  [...items].sort((left, right) => new Date(right?.[key] || 0).getTime() - new Date(left?.[key] || 0).getTime());

const stageProgress = (stage = '') => {
  const order = ['Align', 'Onboard', 'Adopt', 'Enable', 'Expand', 'Renew'];
  const index = Math.max(0, order.indexOf(stage));
  return Math.round(((index + 1) / order.length) * 100);
};

const renderStageGrid = (customerId, devsecopsStages = {}) =>
  DEVSECOPS_STAGES.map(
    (stage) => `
      <article class="card compact-card">
        <div class="metric-head">
          <h3>${stage}</h3>
          ${statusChip({ label: devsecopsStages[stage] || 'Not Started', tone: devsecopsStages[stage] === 'Adopted' ? 'good' : 'warn' })}
        </div>
        <label>
          Status
          <select data-stage-status="${customerId}:${stage}">
            ${STAGE_STATUSES.map(
              (status) => `<option value="${status}" ${devsecopsStages[stage] === status ? 'selected' : ''}>${status}</option>`
            ).join('')}
          </select>
        </label>
      </article>
    `
  ).join('');

const renderUseCaseCards = (customerId, useCases = {}) =>
  USE_CASE_KEYS.map((useCase) => {
    const row = useCases[useCase] || { percent: 0, evidence: 'Not started' };
    return `
      <article class="card compact-card">
        <div class="metric-head">
          <h3>${useCase}</h3>
          ${statusChip({
            label: `${toPercent(row.percent)}%`,
            tone: toPercent(row.percent) >= 75 ? 'good' : toPercent(row.percent) >= 50 ? 'warn' : 'risk'
          })}
        </div>
        <label>
          Adoption percent
          <input type="range" min="0" max="100" step="1" value="${toPercent(row.percent)}" data-usecase-percent="${customerId}:${useCase}" />
        </label>
        <label>
          Evidence notes
          <textarea rows="3" data-usecase-evidence="${customerId}:${useCase}">${row.evidence || ''}</textarea>
        </label>
      </article>
    `;
  }).join('');

const renderTimeToValueRows = (timeToValue = []) => {
  if (!timeToValue.length) {
    return '<tr><td colspan="3">No milestones captured yet.</td></tr>';
  }
  return timeToValue
    .map(
      (item) => `
      <tr>
        <td>${item.milestone}</td>
        <td>${formatDate(item.date)}</td>
        <td>${statusChip({ label: item.status, tone: normalize(item.status) === 'done' ? 'good' : 'warn' })}</td>
      </tr>
    `
    )
    .join('');
};

const renderOutcomeRows = (outcomes = []) => {
  if (!outcomes.length) return '<tr><td colspan="6">No success outcomes yet.</td></tr>';
  return outcomes
    .map(
      (outcome) => `
      <tr>
        <td>${outcome.statement}</td>
        <td>${outcome.metric}</td>
        <td>${outcome.target}</td>
        <td>${formatDate(outcome.due)}</td>
        <td>${statusChip({ label: outcome.status, tone: normalize(outcome.status) === 'at risk' ? 'risk' : 'good' })}</td>
      </tr>
    `
    )
    .join('');
};

const renderMilestoneRows = (milestones = [], outcomes = []) => {
  if (!milestones.length) return '<tr><td colspan="6">No success milestones yet.</td></tr>';
  const outcomeMap = outcomes.reduce((acc, item) => {
    acc[item.id] = item.statement;
    return acc;
  }, {});
  return milestones
    .map(
      (item) => `
      <tr>
        <td>${item.title}</td>
        <td>${outcomeMap[item.outcomeId] || 'Unlinked'}</td>
        <td>${item.owner || 'Unassigned'}</td>
        <td>${formatDate(item.due)}</td>
        <td>${item.status || 'Planned'}</td>
      </tr>
    `
    )
    .join('');
};

const renderEngagementRows = (entries = []) => {
  if (!entries.length) return '<li>No engagement entries logged.</li>';
  return sortByDateDesc(entries)
    .map(
      (item) => `
      <li>
        <strong>${item.type}</strong> on ${formatDate(item.ts)}
        <p class="muted">${item.summary || 'No summary provided.'}</p>
        <p class="muted">Tags: ${(item.tags || []).join(', ') || 'none'} | Owner: ${item.owner || 'CSE'}</p>
      </li>
    `
    )
    .join('');
};

const renderRiskRows = (customerId, signals = []) => {
  if (!signals.length) return '<tr><td colspan="5">No active risk signals.</td></tr>';
  return signals
    .map(
      (signal) => `
      <tr>
        <td>${signal.code}</td>
        <td>${statusChip({ label: signal.severity, tone: normalize(signal.severity) === 'high' || normalize(signal.severity) === 'critical' ? 'risk' : 'warn' })}</td>
        <td>${signal.detail || ''}</td>
        <td>${signal.source || 'manual'}</td>
        <td>
          ${
            signal.source === 'derived'
              ? `<button class="ghost-btn" type="button" data-dismiss-signal="${customerId}:${signal.code}">Dismiss 14d</button>`
              : '<span class="muted">Manual</span>'
          }
        </td>
      </tr>
    `
    )
    .join('');
};

const renderPlaybookRows = (customerId, actions = []) => {
  if (!actions.length) return '<li>No mitigation playbook actions yet.</li>';
  return actions
    .map(
      (action, index) => `
      <li>
        <label class="safe-toggle">
          <input type="checkbox" data-toggle-playbook="${customerId}:${index}" ${
            normalize(action.status) === 'complete' ? 'checked' : ''
          } />
          <span>${action.action} (owner: ${action.owner || 'CSE'}, due ${formatDate(action.due)})</span>
        </label>
      </li>
    `
    )
    .join('');
};

const renderExpansionColumns = (customerId, items = []) =>
  expansionStatuses
    .map((status) => {
      const statusItems = items.filter((item) => normalize(item.status) === normalize(status));
      return `
        <article class="card compact-card">
          <div class="metric-head">
            <h3>${status}</h3>
            ${statusChip({ label: `${statusItems.length}`, tone: 'neutral' })}
          </div>
          <ul class="simple-list">
            ${
              statusItems.length
                ? statusItems
                    .map(
                      (item) => `
                    <li>
                      <strong>${item.title}</strong>
                      <p class="muted">${item.rationale || ''}</p>
                      <p class="muted">${item.estImpact || ''}</p>
                      <label>
                        Status
                        <select data-expansion-status="${customerId}:${item.id}">
                          ${expansionStatuses
                            .map((candidate) => `<option value="${candidate}" ${candidate === item.status ? 'selected' : ''}>${candidate}</option>`)
                            .join('')}
                        </select>
                      </label>
                    </li>
                  `
                    )
                    .join('')
                : '<li>No opportunities in this stage.</li>'
            }
          </ul>
        </article>
      `;
    })
    .join('');

const renderVocRows = (items = []) => {
  if (!items.length) return '<tr><td colspan="5">No VOC entries for this customer.</td></tr>';
  return sortByDateDesc(items, 'createdAt')
    .map(
      (item) => `
      <tr>
        <td>${item.area}</td>
        <td>${item.request}</td>
        <td>${item.impact}</td>
        <td>${formatDate(item.createdAt)}</td>
        <td>${item.status}</td>
      </tr>
    `
    )
    .join('');
};

export const renderCustomerDetailPage = (ctx) => {
  const {
    customer,
    metrics,
    adoption,
    successPlan,
    engagements,
    risk,
    expansion,
    voc,
    customerSafe,
    onUpdateStageStatus,
    onUpdateUseCasePercent,
    onUpdateUseCaseEvidence,
    onAddTimeToValueMilestone,
    onAddOutcome,
    onAddMilestone,
    onAddEngagement,
    onSetRiskOverride,
    onAddRiskSignal,
    onAddPlaybookAction,
    onTogglePlaybookStatus,
    onDismissRiskSignal,
    onAddExpansion,
    onSetExpansionStatus,
    onAddVoc,
    onExportCustomerPdf,
    onExportCustomerCsv,
    maskField,
    navigate
  } = ctx;

  const customerId = customer?.id || '';
  const customerName = maskField?.('accountName', customer?.name) || customer?.name || 'Customer';
  const stagePercent = stageProgress(customer?.stage);
  const renewal = customer?.renewalDate ? `${Math.max(0, metrics?.renewalDays ?? 0)}d` : 'Not configured';
  const riskSignals = risk?.signals || [];
  const expansionItems = expansion || [];
  const vocItems = voc || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'customer');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Customer Workspace',
      title: customerName,
      subtitle:
        'Technical adoption + customer outcomes workspace for Align, Enable, and Expand motions.',
      meta: `Tier: ${customer?.tier || 'Standard'} | ARR: ${customer?.arrBand || 'n/a'} | Renewal: ${formatDate(customer?.renewalDate)}`,
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-customers>Back to customers</button>
        <button class="ghost-btn" type="button" data-export-csv>Export CSV</button>
        <button class="qa" type="button" data-export-pdf>Export summary PDF</button>
      `
    })}

    <section class="card account-header">
      <div class="snapshot-bar">
        ${metricTile({ label: 'Health', value: metrics?.health || 'Yellow', tone: statusToneFromHealth(metrics?.health) })}
        ${metricTile({ label: 'Adoption score', value: metrics?.adoptionScore ?? 0, tone: (metrics?.adoptionScore ?? 0) >= 70 ? 'good' : 'warn' })}
        ${metricTile({ label: 'Engagement score', value: metrics?.engagementScore ?? 0, tone: (metrics?.engagementScore ?? 0) >= 70 ? 'good' : 'warn' })}
        ${metricTile({ label: 'Risk score', value: metrics?.riskScore ?? 0, tone: (metrics?.riskScore ?? 0) >= 65 ? 'risk' : 'warn' })}
        ${metricTile({
          label: 'PtE proxy',
          value: `${metrics?.pteScore ?? 0} (${metrics?.pteBand || 'Low'})`,
          tone: String(metrics?.pteBand || '') === 'High' ? 'good' : String(metrics?.pteBand || '') === 'Medium' ? 'warn' : 'neutral'
        })}
        ${metricTile({
          label: 'PtC proxy',
          value: `${metrics?.ptcScore ?? 0} (${metrics?.ptcBand || 'Low'})`,
          tone: String(metrics?.ptcBand || '') === 'High' ? 'risk' : String(metrics?.ptcBand || '') === 'Medium' ? 'warn' : 'good'
        })}
        ${metricTile({ label: 'Renewal', value: renewal, tone: (metrics?.renewalDays ?? 999) <= 90 ? 'warn' : 'neutral' })}
      </div>
      <div class="lifecycle-progress">
        <div class="metric-head">
          <h3>Lifecycle Stage: ${customer?.stage || 'Enable'}</h3>
          ${statusChip({ label: customerSafe ? 'Customer-safe view' : 'Internal view', tone: customerSafe ? 'good' : 'neutral' })}
        </div>
        <div class="lifecycle-track"><span style="width:${stagePercent}%;"></span></div>
        <details class="score-why">
          <summary>Why these scores?</summary>
          <ul class="simple-list">
            ${(metrics?.why || []).map((reason) => `<li>${reason}</li>`).join('') || '<li>No score factors available yet.</li>'}
          </ul>
        </details>
      </div>
    </section>

    <section class="card compact-card">
      <div class="metric-head">
        <h2>Expansion + Retention Signals</h2>
        ${statusChip({
          label: `PtE ${metrics?.pteBand || 'Low'} | PtC ${metrics?.ptcBand || 'Low'}`,
          tone: String(metrics?.ptcBand || '') === 'High' ? 'risk' : String(metrics?.pteBand || '') === 'High' ? 'good' : 'warn'
        })}
      </div>
      <ul class="simple-list">
        <li><strong>Primary PtE driver:</strong> ${metrics?.pteDriver || 'Not enough adoption and engagement signal depth yet.'}</li>
        <li><strong>Primary PtC driver:</strong> ${metrics?.ptcDriver || 'No material churn pressure detected.'}</li>
        <li><strong>Operator guidance:</strong> Use PtE to prioritize expansion motions and PtC to prioritize retention playbooks.</li>
      </ul>
    </section>

    <section class="card tabs" data-tabs>
      <div class="tab-row">
        <button type="button" class="tab-btn is-active" data-tab-target="adoption" aria-selected="true">Adoption</button>
        <button type="button" class="tab-btn" data-tab-target="success-plan" aria-selected="false">Success Plan</button>
        <button type="button" class="tab-btn" data-tab-target="engagement" aria-selected="false">Engagement</button>
        <button type="button" class="tab-btn" data-tab-target="risk" aria-selected="false">Risk</button>
        <button type="button" class="tab-btn" data-tab-target="expansion" aria-selected="false">Expansion</button>
        <button type="button" class="tab-btn" data-tab-target="voc" aria-selected="false">VOC</button>
      </div>

      <section class="tab-panel is-active" data-tab-panel="adoption" aria-hidden="false">
        <div class="metric-head">
          <h2>DevSecOps Stage Adoption</h2>
          ${statusChip({ label: `${DEVSECOPS_STAGES.length} stages`, tone: 'neutral' })}
        </div>
        <div class="grid-cards">${renderStageGrid(customerId, adoption?.devsecopsStages || {})}</div>

        <div class="metric-head u-mt-4">
          <h2>Use Case Adoption</h2>
          ${statusChip({ label: `${USE_CASE_KEYS.length} tracked`, tone: 'neutral' })}
        </div>
        <div class="grid-cards">${renderUseCaseCards(customerId, adoption?.useCases || {})}</div>

        <section class="card compact-card">
          <div class="metric-head">
            <h3>Time-to-Value Milestones</h3>
            ${statusChip({ label: `${(adoption?.timeToValue || []).length} milestones`, tone: 'neutral' })}
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Milestone</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>${renderTimeToValueRows(adoption?.timeToValue || [])}</tbody>
            </table>
          </div>
          <form class="form-grid u-mt-3" data-add-ttv>
            <label>
              Milestone
              <input name="milestone" required />
            </label>
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label>
              Status
              <select name="status">
                <option value="Planned">Planned</option>
                <option value="Done">Done</option>
              </select>
            </label>
            <div class="form-span page-actions">
              <button class="ghost-btn" type="submit">Add milestone</button>
            </div>
          </form>
        </section>
      </section>

      <section class="tab-panel" data-tab-panel="success-plan" aria-hidden="true">
        <section class="card compact-card">
          <div class="metric-head"><h2>Outcomes</h2></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Outcome</th><th>Metric</th><th>Target</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>${renderOutcomeRows(successPlan?.outcomes || [])}</tbody>
            </table>
          </div>
          <form class="form-grid u-mt-3" data-add-outcome>
            <label><span>Outcome statement</span><input name="statement" required /></label>
            <label><span>Metric</span><input name="metric" required /></label>
            <label><span>Target</span><input name="target" required /></label>
            <label><span>Due</span><input name="due" type="date" required /></label>
            <label><span>Status</span>
              <select name="status">
                <option>On Track</option>
                <option>At Risk</option>
                <option>Complete</option>
              </select>
            </label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Add outcome</button></div>
          </form>
        </section>

        <section class="card compact-card">
          <div class="metric-head"><h2>Milestones</h2></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Milestone</th><th>Outcome Link</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>${renderMilestoneRows(successPlan?.milestones || [], successPlan?.outcomes || [])}</tbody>
            </table>
          </div>
          <form class="form-grid u-mt-3" data-add-plan-milestone>
            <label><span>Title</span><input name="title" required /></label>
            <label><span>Outcome</span>
              <select name="outcomeId">
                ${(successPlan?.outcomes || []).map((item) => `<option value="${item.id}">${item.statement}</option>`).join('')}
              </select>
            </label>
            <label><span>Owner</span><input name="owner" value="CSE" /></label>
            <label><span>Due</span><input name="due" type="date" required /></label>
            <label><span>Status</span>
              <select name="status">
                <option>Planned</option>
                <option>In Progress</option>
                <option>Complete</option>
              </select>
            </label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Add milestone</button></div>
          </form>
        </section>
      </section>

      <section class="tab-panel" data-tab-panel="engagement" aria-hidden="true">
        <section class="card compact-card">
          <div class="metric-head"><h2>Engagement Timeline</h2></div>
          <ul class="simple-list">${renderEngagementRows(engagements || [])}</ul>
          <form class="form-grid u-mt-3" data-add-engagement>
            <label><span>Date</span><input name="date" type="date" required /></label>
            <label><span>Type</span>
              <select name="type">${engagementTypes.map((item) => `<option value="${item}">${item}</option>`).join('')}</select>
            </label>
            <label class="form-span"><span>Summary</span><textarea name="summary" rows="3" required></textarea></label>
            <label><span>Tags (comma separated)</span><input name="tags" /></label>
            <label><span>Owner</span><input name="owner" value="CSE" /></label>
            <label class="form-span"><span>Next steps (comma separated)</span><input name="nextSteps" /></label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Log engagement</button></div>
          </form>
        </section>
      </section>

      <section class="tab-panel" data-tab-panel="risk" aria-hidden="true">
        <section class="card compact-card">
          <div class="metric-head"><h2>Risk Signals</h2></div>
          <label>
            Health override
            <select data-risk-override>
              ${healthOptions
                .map((option) => {
                  const selected = option === 'Auto' ? !risk?.overrideHealth : option === risk?.overrideHealth;
                  return `<option value="${option}" ${selected ? 'selected' : ''}>${option}</option>`;
                })
                .join('')}
            </select>
          </label>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Signal</th><th>Severity</th><th>Detail</th><th>Source</th><th>Action</th></tr></thead>
              <tbody>${renderRiskRows(customerId, riskSignals)}</tbody>
            </table>
          </div>
          <p class="muted">Active dismissals: ${(metrics?.dismissedSignals || []).length}</p>
          <form class="form-grid u-mt-3" data-add-risk>
            <label><span>Code</span><input name="code" required /></label>
            <label><span>Severity</span>
              <select name="severity">${riskSeverities.map((severity) => `<option value="${severity}">${severity}</option>`).join('')}</select>
            </label>
            <label class="form-span"><span>Detail</span><textarea name="detail" rows="2" required></textarea></label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Add manual signal</button></div>
          </form>
        </section>

        <section class="card compact-card">
          <div class="metric-head"><h2>Mitigation Playbook</h2></div>
          <ul class="simple-list">${renderPlaybookRows(customerId, risk?.playbook || [])}</ul>
          <form class="form-grid u-mt-3" data-add-playbook>
            <label class="form-span"><span>Action</span><input name="action" required /></label>
            <label><span>Owner</span><input name="owner" value="CSE" /></label>
            <label><span>Due</span><input name="due" type="date" required /></label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Add playbook action</button></div>
          </form>
        </section>
      </section>

      <section class="tab-panel" data-tab-panel="expansion" aria-hidden="true">
        <div class="grid-cards">${renderExpansionColumns(customerId, expansionItems)}</div>
        <section class="card compact-card">
          <div class="metric-head"><h2>Add expansion opportunity</h2></div>
          <form class="form-grid" data-add-expansion>
            <label><span>Type</span><input name="type" value="UseCaseAdd" /></label>
            <label><span>Status</span>
              <select name="status">${expansionStatuses.map((status) => `<option>${status}</option>`).join('')}</select>
            </label>
            <label class="form-span"><span>Title</span><input name="title" required /></label>
            <label class="form-span"><span>Rationale</span><textarea name="rationale" rows="2" required></textarea></label>
            <label class="form-span"><span>Estimated impact</span><textarea name="estImpact" rows="2" required></textarea></label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Add opportunity</button></div>
          </form>
        </section>
      </section>

      <section class="tab-panel" data-tab-panel="voc" aria-hidden="true">
        <section class="card compact-card">
          <div class="metric-head"><h2>Voice of Customer</h2></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Area</th><th>Request</th><th>Impact</th><th>Created</th><th>Status</th></tr></thead>
              <tbody>${renderVocRows(vocItems)}</tbody>
            </table>
          </div>
          <form class="form-grid u-mt-3" data-add-voc>
            <label><span>Area</span><input name="area" required /></label>
            <label><span>Status</span>
              <select name="status">${vocStatuses.map((status) => `<option>${status}</option>`).join('')}</select>
            </label>
            <label class="form-span"><span>Request</span><textarea name="request" rows="2" required></textarea></label>
            <label class="form-span"><span>Impact</span><textarea name="impact" rows="2" required></textarea></label>
            <div class="form-span page-actions"><button class="ghost-btn" type="submit">Capture VOC</button></div>
          </form>
        </section>
      </section>
    </section>
  `;

  wrapper.querySelector('[data-go-customers]')?.addEventListener('click', () => navigate('customers'));
  wrapper.querySelector('[data-export-pdf]')?.addEventListener('click', () => onExportCustomerPdf?.(customerId));
  wrapper.querySelector('[data-export-csv]')?.addEventListener('click', () => onExportCustomerCsv?.(customerId));

  wrapper.querySelectorAll('[data-stage-status]').forEach((select) => {
    select.addEventListener('change', () => {
      const [id, stage] = String(select.getAttribute('data-stage-status') || '').split(':');
      if (!id || !stage) return;
      onUpdateStageStatus?.(id, stage, select.value);
    });
  });

  wrapper.querySelectorAll('[data-usecase-percent]').forEach((input) => {
    input.addEventListener('change', () => {
      const [id, useCase] = String(input.getAttribute('data-usecase-percent') || '').split(':');
      if (!id || !useCase) return;
      onUpdateUseCasePercent?.(id, useCase, toPercent(input.value));
    });
  });

  wrapper.querySelectorAll('[data-usecase-evidence]').forEach((input) => {
    input.addEventListener('blur', () => {
      const [id, useCase] = String(input.getAttribute('data-usecase-evidence') || '').split(':');
      if (!id || !useCase) return;
      onUpdateUseCaseEvidence?.(id, useCase, String(input.value || '').trim());
    });
  });

  wrapper.querySelector('[data-add-ttv]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddTimeToValueMilestone?.(customerId, {
      milestone: String(form.get('milestone') || '').trim(),
      date: String(form.get('date') || '').trim(),
      status: String(form.get('status') || 'Planned')
    });
  });

  wrapper.querySelector('[data-add-outcome]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddOutcome?.(customerId, {
      statement: String(form.get('statement') || '').trim(),
      metric: String(form.get('metric') || '').trim(),
      target: String(form.get('target') || '').trim(),
      due: String(form.get('due') || '').trim(),
      status: String(form.get('status') || 'On Track')
    });
  });

  wrapper.querySelector('[data-add-plan-milestone]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddMilestone?.(customerId, {
      title: String(form.get('title') || '').trim(),
      outcomeId: String(form.get('outcomeId') || '').trim(),
      owner: String(form.get('owner') || 'CSE').trim(),
      due: String(form.get('due') || '').trim(),
      status: String(form.get('status') || 'Planned')
    });
  });

  wrapper.querySelector('[data-add-engagement]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddEngagement?.(customerId, {
      date: String(form.get('date') || '').trim(),
      type: String(form.get('type') || '1:1').trim(),
      summary: String(form.get('summary') || '').trim(),
      tags: String(form.get('tags') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      owner: String(form.get('owner') || 'CSE').trim(),
      nextSteps: String(form.get('nextSteps') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    });
  });

  wrapper.querySelector('[data-risk-override]')?.addEventListener('change', (event) => {
    const value = String(event.target.value || 'Auto');
    onSetRiskOverride?.(customerId, value === 'Auto' ? null : value);
  });

  wrapper.querySelector('[data-add-risk]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddRiskSignal?.(customerId, {
      code: String(form.get('code') || '').trim(),
      severity: String(form.get('severity') || 'Medium').trim(),
      detail: String(form.get('detail') || '').trim()
    });
  });

  wrapper.querySelectorAll('[data-dismiss-signal]').forEach((button) => {
    button.addEventListener('click', () => {
      const [id, code] = String(button.getAttribute('data-dismiss-signal') || '').split(':');
      if (!id || !code) return;
      onDismissRiskSignal?.(id, code);
    });
  });

  wrapper.querySelector('[data-add-playbook]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddPlaybookAction?.(customerId, {
      action: String(form.get('action') || '').trim(),
      owner: String(form.get('owner') || 'CSE').trim(),
      due: String(form.get('due') || '').trim(),
      status: 'Planned'
    });
  });

  wrapper.querySelectorAll('[data-toggle-playbook]').forEach((input) => {
    input.addEventListener('change', () => {
      const [id, indexValue] = String(input.getAttribute('data-toggle-playbook') || '').split(':');
      const index = Number(indexValue || 0);
      if (!id || !Number.isFinite(index)) return;
      onTogglePlaybookStatus?.(id, index, Boolean(input.checked));
    });
  });

  wrapper.querySelector('[data-add-expansion]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddExpansion?.(customerId, {
      type: String(form.get('type') || 'UseCaseAdd').trim(),
      title: String(form.get('title') || '').trim(),
      rationale: String(form.get('rationale') || '').trim(),
      estImpact: String(form.get('estImpact') || '').trim(),
      status: String(form.get('status') || 'Open').trim()
    });
  });

  wrapper.querySelectorAll('[data-expansion-status]').forEach((select) => {
    select.addEventListener('change', () => {
      const [id, opportunityId] = String(select.getAttribute('data-expansion-status') || '').split(':');
      if (!id || !opportunityId) return;
      onSetExpansionStatus?.(id, opportunityId, String(select.value || 'Open'));
    });
  });

  wrapper.querySelector('[data-add-voc]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddVoc?.({
      customerId,
      area: String(form.get('area') || '').trim(),
      request: String(form.get('request') || '').trim(),
      impact: String(form.get('impact') || '').trim(),
      status: String(form.get('status') || 'Captured').trim()
    });
  });

  wireTabs(wrapper);
  return wrapper;
};

export const customerDetailCommandEntries = (workspace) =>
  (workspace?.customers || []).map((customer) => ({
    id: `customer-workspace-${customer.id}`,
    label: `Customer workspace: ${customer.name}`,
    meta: `Stage ${customer.stage}`,
    action: { route: 'customer', params: { id: customer.id } }
  }));
