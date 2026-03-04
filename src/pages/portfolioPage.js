import { createDataTable } from '../components/dataTable.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { formatDate, parseDate } from '../lib/date.js';
import { loadEngagementLog } from '../lib/engagementLog.js';
import { applyPortfolioFilters } from '../lib/scoring.js';

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

export const renderPortfolioHomePage = (ctx) => {
  const { portfolio, filters, navigate, onLogAttendance, onExportPortfolio, onCopyShare, updatedOn, accountLoadError, onRetryData } = ctx;

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

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'today');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Today</p>
        <h1>Today Console</h1>
        <p class="hero-lede">Your prioritized CSE operating queue for triage, enablement, and lifecycle progression.</p>
        <p class="muted page-meta">Last updated: ${formatDate(updatedOn)}</p>
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-go-intake>Create Engagement Request</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Open Portfolio</button>
        <button class="ghost-btn" type="button" data-export-portfolio>Export Portfolio CSV</button>
        <button class="ghost-btn" type="button" data-share-snapshot>Share snapshot</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Priority Items', value: portfolio.todayQueue.length, tone: portfolio.todayQueue.length ? 'warn' : 'good' })}
        ${metricTile({ label: 'Red Accounts', value: portfolio.stats.redAccounts, tone: portfolio.stats.redAccounts ? 'risk' : 'good' })}
        ${metricTile({ label: 'Stale > 30d', value: staleSignals.length, tone: staleSignals.length ? 'warn' : 'good' })}
        ${metricTile({ label: 'Renewal < 90d', value: renewalSignals.length, tone: renewalSignals.length ? 'warn' : 'good' })}
      </div>
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
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-share-snapshot]')?.addEventListener('click', onCopyShare);
  wrapper.querySelector('[data-retry-data]')?.addEventListener('click', () => onRetryData?.());

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

  return wrapper;
};

export const renderPortfolioPage = (ctx) => {
  const { portfolio, filters, onSetFilters, navigate, onExportPortfolio, updatedOn, accountLoadError, onRetryData } = ctx;
  const segments = uniqueSegments(portfolio.signals);
  const lowUseCases = uniqueUseCases(portfolio.signals);
  const staleThreshold = Number(filters.staleDays || 30);
  const filtered = applyPortfolioFilters(portfolio.signals, filters);
  const outlierSignals = applyPortfolioFilters(portfolio.outliers, filters);
  const matrix = healthMatrix(filtered);

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
