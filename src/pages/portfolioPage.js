import { createDataTable } from '../components/dataTable.js';
import { renderActionDrawer } from '../components/actionDrawer.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { formatDate, formatDateTime } from '../lib/date.js';
import { applyPortfolioFilters } from '../lib/scoring.js';

const uniqueSegments = (signals) => ['all', ...new Set((signals || []).map((signal) => signal.account.segment))];

const uniqueUseCases = (signals) =>
  ['all', ...new Set((signals || []).map((signal) => String(signal.lowestUseCaseName || '').toLowerCase()))].filter(Boolean);

const shortActionList = (items, empty, count = 5) =>
  items.length
    ? `<ul class="simple-list">${items
        .slice(0, count)
        .map((item) => `<li><a href="#" data-open-account="${item.account.id}">${item.account.name}</a> - ${item.reasons[0] || 'Review'}</li>`)
        .join('')}</ul>`
    : `<p class="empty-text">${empty}</p>`;

const renderProgramCard = (program) => `
  <article class="compact-card card">
    <div class="metric-head">
      <h3>${program.title}</h3>
      ${statusChip({ label: program.type, tone: 'neutral' })}
    </div>
    <p class="muted">${formatDateTime(program.date)}</p>
    <p class="muted">Targets: ${(program.target_use_cases || []).join(', ')}</p>
    <p class="muted">Registration ${program.registration_count} | Attendance ${program.attendance_count}</p>
    <div class="page-actions">
      <button class="ghost-btn" type="button" data-copy-invite="${program.program_id}">Copy invite</button>
      <button class="ghost-btn" type="button" data-log-attendance="${program.program_id}">Log attendance</button>
    </div>
  </article>
`;

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

const outlierRow = (signal) => `
  <td><a href="#" data-open-account="${signal.account.id}">${signal.account.name}</a></td>
  <td>${statusChip({ label: signal.account.health?.overall, tone: statusToneFromHealth(signal.account.health?.overall) })}</td>
  <td>${signal.greenUseCaseCount || 0}/4 green</td>
  <td>${signal.renewalDays ?? 'Missing data'}d</td>
  <td>${formatDate(signal.account.engagement?.last_touch_date)}</td>
  <td>${signal.isStale ? statusChip({ label: 'Stale', tone: 'stale' }) : statusChip({ label: 'Fresh', tone: 'good' })}</td>
  <td>${signal.reasons.slice(0, 2).join(' | ') || 'Watchlist'}</td>
`;

export const renderPortfolioHomePage = (ctx) => {
  const { portfolio, filters, onSetFilters, navigate, mode, onCopyInvite, onLogAttendance, onExportPortfolio, onCopyShare } = ctx;

  const segments = uniqueSegments(portfolio.signals);
  const lowUseCases = uniqueUseCases(portfolio.signals);
  const staleThreshold = Number(filters.staleDays || 30);
  const staleSignals = portfolio.signals.filter((signal) => Number(signal.healthStaleDays || 0) > staleThreshold);
  const renewalSignals = portfolio.signals
    .filter((signal) => Number(signal.renewalDays ?? 999) <= 90)
    .sort((left, right) => (left.renewalDays ?? 999) - (right.renewalDays ?? 999));
  const trendWatch = portfolio.signals.filter(
    (signal) => ['yellow', 'red'].includes(String(signal.account.health?.overall || '').toLowerCase()) || Number(signal.account.adoption?.trend_30d || 0) < 0
  );
  const overdue = portfolio.todayQueue.filter((item) => Number(item.due_in_days ?? 0) < 0);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Work Queue</p>
        <h1>Pooled Work Queue Command Center</h1>
        <p class="hero-lede">Triage first: due work, outliers, and 1:many enablement motions.</p>
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-go-intake>Create Engagement Request</button>
        <button class="qa" type="button" data-go-portfolio>Open Full Portfolio View</button>
        <button class="ghost-btn" type="button" data-export-portfolio>Export Portfolio CSV</button>
        <button class="ghost-btn" type="button" data-share-snapshot>Share snapshot</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Accounts', value: portfolio.stats.totalAccounts, tone: 'neutral' })}
        ${metricTile({ label: 'Red Health', value: portfolio.stats.redAccounts, tone: portfolio.stats.redAccounts ? 'risk' : 'good' })}
        ${metricTile({ label: 'Stale Data', value: staleSignals.length, tone: staleSignals.length ? 'warn' : 'good', tooltip: `Stale means health update older than ${staleThreshold} days.` })}
        ${metricTile({ label: 'Requests Waiting', value: portfolio.stats.requestsWaiting, tone: portfolio.stats.requestsWaiting ? 'warn' : 'good' })}
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Portfolio Filters</h2>
      </div>
      <div class="filter-row">
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
            <option value="0-90" ${filters.renewalWindow === '0-90' ? 'selected' : ''}>0-90</option>
            <option value="91-180" ${filters.renewalWindow === '91-180' ? 'selected' : ''}>91-180</option>
            <option value="180+" ${filters.renewalWindow === '180+' ? 'selected' : ''}>180+</option>
          </select>
        </label>
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
          Engagement Recency
          <select data-filter="engagementRecency">
            <option value="all" ${filters.engagementRecency === 'all' ? 'selected' : ''}>All</option>
            <option value="0-14" ${filters.engagementRecency === '0-14' ? 'selected' : ''}>0-14 days</option>
            <option value="15-30" ${filters.engagementRecency === '15-30' ? 'selected' : ''}>15-30 days</option>
            <option value="31+" ${filters.engagementRecency === '31+' ? 'selected' : ''}>31+ days</option>
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
          <span>Stale data only</span>
        </label>
        <label class="safe-toggle">
          <input type="checkbox" data-filter-check="hasOpenRequest" ${filters.hasOpenRequest ? 'checked' : ''} />
          <span>Has open request</span>
        </label>
        <label class="safe-toggle">
          <input type="checkbox" data-filter-check="belowThreeGreen" ${filters.belowThreeGreen ? 'checked' : ''} />
          <span>Below 3 green use cases</span>
        </label>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="main-col">
        <section class="card">
          <div class="metric-head">
            <h2>Work Queue</h2>
            ${statusChip({ label: `${portfolio.todayQueue.length} due`, tone: portfolio.todayQueue.length ? 'warn' : 'good' })}
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
            <h2>Overdue Actions</h2>
            ${statusChip({ label: `${overdue.length} overdue`, tone: overdue.length ? 'risk' : 'good' })}
          </div>
          <ul class="simple-list">
            ${
              overdue
                .slice(0, 6)
                .map((item) => `<li><a href="#" data-open-account="${item.account_id}">${item.account_name}</a> - ${item.topic} (${item.stage}) overdue by ${Math.abs(item.due_in_days)}d</li>`)
                .join('') || '<li>No overdue items.</li>'
            }
          </ul>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Renewal Window &lt; 90 Days</h2>
            ${statusChip({ label: `${renewalSignals.length} accounts`, tone: renewalSignals.length ? 'warn' : 'good' })}
          </div>
          ${shortActionList(renewalSignals, 'No accounts in 90-day renewal window.')}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Yellow/Red Trend Watch</h2>
            ${statusChip({ label: `${trendWatch.length} accounts`, tone: trendWatch.length ? 'warn' : 'good' })}
          </div>
          ${shortActionList(trendWatch, 'No yellow/red trend accounts.')}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Requests Awaiting Triage</h2>
            ${statusChip({ label: `${portfolio.triageQueue.length} waiting`, tone: portfolio.triageQueue.length ? 'warn' : 'good' })}
          </div>
          <ul class="simple-list">
            ${portfolio.triageQueue
              .slice(0, 6)
              .map((item) => `<li><a href="#" data-open-account="${item.account_id}">${item.request_id}</a> - ${item.topic} (${item.requestor_role}) due ${formatDate(item.due_date)}</li>`)
              .join('') || '<li>No triage items waiting.</li>'}
          </ul>
        </section>
      </div>

      <div class="mid-col">
        <section class="card">
          <div class="metric-head">
            <h2>Outliers</h2>
            ${statusChip({ label: `${portfolio.outliers.length} flagged`, tone: portfolio.outliers.length ? 'risk' : 'good' })}
          </div>
          <div data-outlier-table></div>
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Stale Data &gt; ${staleThreshold} Days</h2>
            ${statusChip({ label: `${staleSignals.length} stale`, tone: staleSignals.length ? 'warn' : 'good' })}
          </div>
          ${shortActionList(staleSignals, `No stale accounts above ${staleThreshold} days.`)}
        </section>

        <section class="card">
          <div class="metric-head">
            <h2>Programs (Enablement)</h2>
            <button class="ghost-btn" type="button" data-go-programs>Open Programs</button>
          </div>
          <div class="main-col">
            ${portfolio.upcomingPrograms.slice(0, 4).map(renderProgramCard).join('') || '<p class="empty-text">No upcoming programs.</p>'}
          </div>
        </section>
      </div>

      <div class="right-col" data-drawer></div>
    </section>
  `;

  const filteredSignals = applyPortfolioFilters(portfolio.outliers, filters);

  const table = createDataTable({
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'health', label: 'Health' },
      { key: 'adoptionCount', label: 'Adoption' },
      { key: 'renewalDays', label: 'Renewal' },
      { key: 'lastTouch', label: 'Last Touch' },
      { key: 'stale', label: 'Stale' },
      { key: 'reason', label: 'Why Flagged', sortable: false }
    ],
    rows: filteredSignals.map((signal) => ({
      ...signal,
      name: signal.account.name,
      health: signal.account.health?.overall,
      adoptionCount: `${signal.greenUseCaseCount || 0}/4`,
      lastTouch: signal.account.engagement?.last_touch_date || '',
      stale: signal.isStale ? 'stale' : 'fresh',
      reason: signal.reasons[0] || 'Watchlist'
    })),
    defaultSort: { key: 'renewalDays', direction: 'asc' },
    rowRenderer: (row) => outlierRow(row)
  });

  wrapper.querySelector('[data-outlier-table]').appendChild(table.element);

  const drawer = renderActionDrawer({
    title: 'Portfolio Action Drawer',
    mode,
    nextActions: portfolio.actions.immediate,
    dueSoon: portfolio.actions.dueSoon,
    riskSignals: portfolio.actions.strategic,
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio,
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer]').appendChild(drawer);

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-intake]')?.addEventListener('click', () => navigate('intake'));
  wrapper.querySelector('[data-go-programs]')?.addEventListener('click', () => navigate('programs'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-share-snapshot]')?.addEventListener('click', onCopyShare);

  wrapper.addEventListener('click', (event) => {
    const accountLink = event.target.closest('[data-open-account]');
    if (accountLink) {
      event.preventDefault();
      navigate('account', { id: accountLink.getAttribute('data-open-account') });
      return;
    }

    const invite = event.target.closest('[data-copy-invite]');
    if (invite) {
      onCopyInvite(invite.getAttribute('data-copy-invite'));
      return;
    }

    const attendance = event.target.closest('[data-log-attendance]');
    if (attendance) {
      onLogAttendance(attendance.getAttribute('data-log-attendance'));
    }
  });

  wrapper.querySelectorAll('[data-filter]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-filter');
      const value = key === 'staleDays' ? Number(input.value) : input.value;
      onSetFilters({ [key]: value });
    });
  });

  wrapper.querySelectorAll('[data-filter-check]').forEach((input) => {
    input.addEventListener('change', () => onSetFilters({ [input.getAttribute('data-filter-check')]: Boolean(input.checked) }));
  });

  return wrapper;
};

export const renderPortfolioPage = (ctx) => {
  const { portfolio, filters, onSetFilters, navigate, mode, onExportPortfolio } = ctx;

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Portfolio</p>
        <h1>Portfolio Operating Table</h1>
        <p class="hero-lede">Detailed pooled table with working filters for segment, renewal, health, stale data, lowest use-case, and open requests.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio Home</button>
        <button class="qa" type="button" data-export-portfolio>Export Portfolio CSV</button>
      </div>
    </header>

    <section class="card">
      <div class="filter-row" data-filters-host></div>
      <div data-table-host></div>
    </section>
  `;

  const segments = uniqueSegments(portfolio.signals);
  const lowUseCases = uniqueUseCases(portfolio.signals);
  wrapper.querySelector('[data-filters-host]').innerHTML = `
    <label>
      Segment
      <select data-filter="segment">${segments.map((segment) => `<option value="${segment}" ${filters.segment === segment ? 'selected' : ''}>${segment}</option>`).join('')}</select>
    </label>
    <label>
      Renewal
      <select data-filter="renewalWindow">
        <option value="all" ${filters.renewalWindow === 'all' ? 'selected' : ''}>All</option>
        <option value="0-90" ${filters.renewalWindow === '0-90' ? 'selected' : ''}>0-90</option>
        <option value="91-180" ${filters.renewalWindow === '91-180' ? 'selected' : ''}>91-180</option>
        <option value="180+" ${filters.renewalWindow === '180+' ? 'selected' : ''}>180+</option>
      </select>
    </label>
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
      Engagement Recency
      <select data-filter="engagementRecency">
        <option value="all" ${filters.engagementRecency === 'all' ? 'selected' : ''}>All</option>
        <option value="0-14" ${filters.engagementRecency === '0-14' ? 'selected' : ''}>0-14 days</option>
        <option value="15-30" ${filters.engagementRecency === '15-30' ? 'selected' : ''}>15-30 days</option>
        <option value="31+" ${filters.engagementRecency === '31+' ? 'selected' : ''}>31+ days</option>
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
      Lowest use-case
      <select data-filter="lowestUseCase">${lowUseCases.map((name) => `<option value="${name}" ${filters.lowestUseCase === name ? 'selected' : ''}>${name}</option>`).join('')}</select>
    </label>
    <label class="safe-toggle">
      <input type="checkbox" data-filter-check="staleOnly" ${filters.staleOnly ? 'checked' : ''} />
      <span>Stale only</span>
    </label>
    <label class="safe-toggle">
      <input type="checkbox" data-filter-check="hasOpenRequest" ${filters.hasOpenRequest ? 'checked' : ''} />
      <span>Has open request</span>
    </label>
    <label class="safe-toggle">
      <input type="checkbox" data-filter-check="belowThreeGreen" ${filters.belowThreeGreen ? 'checked' : ''} />
      <span>Below 3 green use cases</span>
    </label>
  `;

  const filtered = applyPortfolioFilters(portfolio.signals, filters);
  const table = createDataTable({
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'segment', label: 'Segment' },
      { key: 'health', label: 'Health' },
      { key: 'adoptionCount', label: 'Adoption' },
      { key: 'renewalDays', label: 'Renewal Days' },
      { key: 'lastTouch', label: 'Last Touch' },
      { key: 'stale', label: 'Stale' },
      { key: 'reason', label: 'Why Flagged', sortable: false }
    ],
    rows: filtered.map((signal) => ({
      ...signal,
      name: signal.account.name,
      segment: signal.account.segment,
      health: signal.account.health?.overall,
      adoptionCount: `${signal.greenUseCaseCount || 0}/4`,
      renewalDays: signal.renewalDays ?? 999,
      lastTouch: signal.account.engagement?.last_touch_date || '',
      stale: signal.isStale ? 'stale' : 'fresh',
      reason: signal.reasons[0] || 'Watchlist'
    })),
    defaultSort: { key: 'renewalDays', direction: 'asc' },
    rowRenderer: (row) => `
      <td><a href="#" data-open-account="${row.account.id}">${row.account.name}</a></td>
      <td>${row.account.segment}</td>
      <td>${statusChip({ label: row.account.health?.overall, tone: statusToneFromHealth(row.account.health?.overall) })}</td>
      <td>${row.greenUseCaseCount || 0}/4 green</td>
      <td>${row.renewalDays === 999 ? 'Missing data' : row.renewalDays}</td>
      <td>${formatDate(row.account.engagement?.last_touch_date)}</td>
      <td>${row.isStale ? statusChip({ label: 'Stale', tone: 'stale' }) : statusChip({ label: 'Fresh', tone: 'good' })}</td>
      <td>${row.reasons.slice(0, 2).join(' | ') || 'Watchlist'}</td>
    `
  });

  wrapper.querySelector('[data-table-host]').appendChild(table.element);

  const drawer = renderActionDrawer({
    title: 'Portfolio Action Drawer',
    mode,
    nextActions: portfolio.actions.immediate,
    dueSoon: portfolio.actions.dueSoon,
    riskSignals: portfolio.actions.strategic,
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio,
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });

  const holder = document.createElement('section');
  holder.className = 'dashboard-grid';
  const left = document.createElement('div');
  left.className = 'main-col';
  left.appendChild(wrapper.querySelector('section.card'));
  const right = document.createElement('div');
  right.className = 'right-col';
  right.appendChild(drawer);

  holder.appendChild(left);
  holder.appendChild(document.createElement('div'));
  holder.appendChild(right);

  wrapper.appendChild(holder);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);

  wrapper.querySelectorAll('[data-filter]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-filter');
      const value = key === 'staleDays' ? Number(input.value) : input.value;
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

  return [
    { id: 'go-home', label: 'Open Work Queue', meta: 'Queue', action: { route: 'home' } },
    { id: 'go-portfolio', label: 'Open Portfolio Table', meta: 'Portfolio', action: { route: 'portfolio' } },
    ...accountEntries
  ];
};
