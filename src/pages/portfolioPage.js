import { createDataTable } from '../components/dataTable.js';
import { renderActionDrawer } from '../components/actionDrawer.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip, statusToneFromHealth } from '../components/statusChip.js';
import { formatDate, formatDateTime } from '../lib/date.js';
import { applyPortfolioFilters } from '../lib/scoring.js';

const uniqueSegments = (signals) => ['all', ...new Set((signals || []).map((signal) => signal.account.segment))];

const uniqueUseCases = (signals) =>
  ['all', ...new Set((signals || []).map((signal) => String(signal.lowestUseCaseName || '').toLowerCase()))].filter(Boolean);

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
  <td>${signal.renewalDays ?? 'Missing data'}d</td>
  <td>${signal.account.adoption?.platform_adoption_level || 'Missing data'}</td>
  <td>${signal.isStale ? statusChip({ label: 'Stale', tone: 'stale' }) : statusChip({ label: 'Fresh', tone: 'good' })}</td>
  <td>${signal.reasons.slice(0, 2).join(' | ') || 'Watchlist'}</td>
`;

export const renderPortfolioHomePage = (ctx) => {
  const { portfolio, filters, onSetFilters, navigate, mode, onCopyInvite, onLogAttendance, onExportPortfolio, onCopyShare } = ctx;

  const segments = uniqueSegments(portfolio.signals);
  const lowUseCases = uniqueUseCases(portfolio.signals);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Portfolio Home</p>
        <h1>Pooled Coverage Command Center</h1>
        <p class="hero-lede">Default pooled view across work queue, outliers, and 1:many enablement programs.</p>
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-go-portfolio>Open Full Portfolio View</button>
        <button class="ghost-btn" type="button" data-export-portfolio>Export Portfolio CSV</button>
        <button class="ghost-btn" type="button" data-share-snapshot>Share snapshot</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Accounts', value: portfolio.stats.totalAccounts, tone: 'neutral' })}
        ${metricTile({ label: 'Red Health', value: portfolio.stats.redAccounts, tone: portfolio.stats.redAccounts ? 'risk' : 'good' })}
        ${metricTile({ label: 'Stale Data', value: portfolio.stats.staleAccounts, tone: portfolio.stats.staleAccounts ? 'warn' : 'good', tooltip: 'Stale means health update older than 10 days.' })}
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
      { key: 'renewalDays', label: 'Renewal' },
      { key: 'platform', label: 'Platform' },
      { key: 'stale', label: 'Stale' },
      { key: 'reason', label: 'Why Flagged', sortable: false }
    ],
    rows: filteredSignals.map((signal) => ({
      ...signal,
      name: signal.account.name,
      health: signal.account.health?.overall,
      platform: signal.account.adoption?.platform_adoption_level,
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
    input.addEventListener('change', () => onSetFilters({ [input.getAttribute('data-filter')]: input.value }));
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
  `;

  const filtered = applyPortfolioFilters(portfolio.signals, filters);
  const table = createDataTable({
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'segment', label: 'Segment' },
      { key: 'health', label: 'Health' },
      { key: 'renewalDays', label: 'Renewal Days' },
      { key: 'platform', label: 'Platform' },
      { key: 'lowest', label: 'Lowest Use Case' },
      { key: 'open', label: 'Open Requests' },
      { key: 'stale', label: 'Stale' },
      { key: 'reason', label: 'Why Flagged', sortable: false }
    ],
    rows: filtered.map((signal) => ({
      ...signal,
      name: signal.account.name,
      segment: signal.account.segment,
      health: signal.account.health?.overall,
      renewalDays: signal.renewalDays ?? 999,
      platform: signal.account.adoption?.platform_adoption_level,
      lowest: `${signal.lowestUseCaseName} (${signal.lowestUseCaseScore})`,
      open: signal.requestList.length,
      stale: signal.isStale ? 'stale' : 'fresh',
      reason: signal.reasons[0] || 'Watchlist'
    })),
    defaultSort: { key: 'renewalDays', direction: 'asc' },
    rowRenderer: (row) => `
      <td><a href="#" data-open-account="${row.account.id}">${row.account.name}</a></td>
      <td>${row.account.segment}</td>
      <td>${statusChip({ label: row.account.health?.overall, tone: statusToneFromHealth(row.account.health?.overall) })}</td>
      <td>${row.renewalDays === 999 ? 'Missing data' : row.renewalDays}</td>
      <td>${row.account.adoption?.platform_adoption_level}</td>
      <td>${row.lowestUseCaseName} (${row.lowestUseCaseScore})</td>
      <td>${row.requestList.length}</td>
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
    input.addEventListener('change', () => onSetFilters({ [input.getAttribute('data-filter')]: input.value }));
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
    { id: 'go-home', label: 'Open Portfolio Home', meta: 'Portfolio', action: { route: 'home' } },
    { id: 'go-portfolio', label: 'Open Portfolio Table', meta: 'Portfolio', action: { route: 'portfolio' } },
    ...accountEntries
  ];
};
