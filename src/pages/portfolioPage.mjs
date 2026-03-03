import { formatDate, daysUntil } from '../lib/date.mjs';

const healthTone = (health) => {
  const value = String(health || '').toLowerCase();
  if (value === 'red') return 'risk';
  if (value === 'green') return 'good';
  return 'watch';
};

const stageLabel = (stage) => {
  const value = String(stage || '').toLowerCase();
  if (!value) return 'unknown';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const queueRows = (items) =>
  items
    .map(
      (item) => `
      <tr>
        <td><a href="#" data-open-account="${item.account_id}">${item.account_name}</a></td>
        <td>${item.topic}</td>
        <td>${item.stage}</td>
        <td>${formatDate(item.due_date)}</td>
        <td><span class="status-pill" data-status="${item.urgency}">${item.status}</span></td>
        <td>${item.assigned_to || 'Unassigned'}</td>
      </tr>
    `
    )
    .join('');

const outlierRows = (items) =>
  items
    .map((item) => {
      const health = String(item.account.health?.overall || 'yellow').toLowerCase();
      return `
      <tr>
        <td><a href="#" data-open-account="${item.account.id}">${item.account.name}</a></td>
        <td><span class="status-pill" data-status="${healthTone(health)}">${health}</span></td>
        <td>${item.account.adoption?.trend_30d ?? 0}%</td>
        <td>${item.renewalDays ?? 'TBD'} days</td>
        <td>${item.healthStaleDays ?? 'TBD'} days</td>
        <td>${(item.reasons || []).slice(0, 2).join(' | ') || 'Watchlist'}</td>
      </tr>
    `;
    })
    .join('');

const programRows = (items, now) =>
  items
    .map((program) => {
      const due = daysUntil(program.date, now);
      return `
      <article class="card compact-card">
        <div class="metric-head">
          <h3>${program.title}</h3>
          <span class="status-pill" data-status="good">${program.type}</span>
        </div>
        <p class="muted">${formatDate(program.date)} (${due} days)</p>
        <p class="muted">Targets: ${(program.target_use_cases || []).join(', ')}</p>
        <p class="muted">Registrations ${program.registration_count} | Attendance ${program.attendance_count}</p>
        <div class="inline-actions">
          <button class="ghost-btn" type="button" data-copy-invite="${program.program_id}">Copy invite blurb</button>
          <button class="ghost-btn" type="button" data-log-attendance="${program.program_id}">Log attendance</button>
        </div>
      </article>
    `;
    })
    .join('');

export const renderPortfolioPage = (ctx) => {
  const { data, portfolio, navigate, customerSafe, onToggleSafe, onExportPortfolio, onCopyInvite, onLogAttendance } = ctx;
  const now = new Date();
  const state = {
    outlierHealth: 'all',
    outlierStaleOnly: false
  };
  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';

  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Pooled Coverage</p>
        <h1>Pooled CSE On-Demand Queue</h1>
        <p class="hero-lede">Run pooled triage first: prioritize account risk, route to 1:many programs, and drill into accounts only when needed.</p>
        <p class="muted hint-text">Handbook intent: CSE delivery runs as pooled on-demand motions (webinars, labs, office hours), not dedicated account assignment.</p>
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-go-intake>New intake request</button>
        <button class="ghost-btn" type="button" data-export-portfolio>Export Portfolio CSV</button>
        <label class="safe-toggle">
          <input type="checkbox" data-safe-toggle ${customerSafe ? 'checked' : ''} />
          <span>Customer-safe mode</span>
        </label>
      </div>
    </header>

    <div class="kpi-grid kpi-4">
      <article class="card compact-card">
        <h3>Total accounts</h3>
        <p class="stat">${portfolio.stats.totalAccounts}</p>
      </article>
      <article class="card compact-card">
        <h3>Red health accounts</h3>
        <p class="stat">${portfolio.stats.redAccounts}</p>
      </article>
      <article class="card compact-card">
        <h3>Stale health updates</h3>
        <p class="stat">${portfolio.stats.staleAccounts}</p>
      </article>
      <article class="card compact-card">
        <h3>Triage waiting</h3>
        <p class="stat">${portfolio.stats.requestsWaiting}</p>
      </article>
    </div>

    <div class="three-col">
      <section class="card">
        <div class="metric-head">
          <h2>Today Queue</h2>
          <span class="status-pill" data-status="watch">${portfolio.todayQueue.length} due in 7d</span>
        </div>
        <p class="muted">Requests due today through next 7 days, across the pooled queue.</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Account</th><th>Topic</th><th>Stage</th><th>Due</th><th>Status</th><th>Assigned</th></tr>
            </thead>
            <tbody>
              ${portfolio.todayQueue.length ? queueRows(portfolio.todayQueue) : '<tr><td colspan="6">No due requests in next 7 days.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="metric-head">
          <h2>Outliers</h2>
          <span class="status-pill" data-status="risk" data-outlier-count>${portfolio.outliers.length} flagged</span>
        </div>
        <p class="muted">Accounts with largest negative drift, stale health updates, or renewal pressure.</p>
        <div class="inline-actions">
          <label>
            <span class="modebar-label">Health</span>
            <select data-outlier-health>
              <option value="all">All</option>
              <option value="red">Red</option>
              <option value="yellow">Yellow</option>
              <option value="green">Green</option>
            </select>
          </label>
          <label class="safe-toggle">
            <input type="checkbox" data-outlier-stale />
            <span>Stale only (&gt;10 days)</span>
          </label>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Account</th><th>Health</th><th>Trend</th><th>Renewal</th><th>Stale</th><th>Why flagged</th></tr>
            </thead>
            <tbody data-outlier-body>
              ${portfolio.outliers.length ? outlierRows(portfolio.outliers) : '<tr><td colspan="6">No outliers detected.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="metric-head">
          <h2>Programs</h2>
          <button class="ghost-btn" type="button" data-go-programs>Open Programs</button>
        </div>
        <p class="muted">Use 1:many programming first to scale pooled CSE impact.</p>
        <div class="stacked-cards">
          ${portfolio.upcomingPrograms.length ? programRows(portfolio.upcomingPrograms, now) : '<p class="empty-text">No programs in next 21 days.</p>'}
        </div>
      </section>
    </div>

    <section class="card">
      <div class="metric-head">
        <h2>Requests Triage</h2>
        <span class="status-pill" data-status="watch">${portfolio.triageQueue.length} waiting</span>
      </div>
      <p class="muted">New/triage intake items waiting for pooled assignment.</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Request</th><th>Account</th><th>Requestor</th><th>Topic</th><th>Due</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${
              portfolio.triageQueue.length
                ? portfolio.triageQueue
                    .map(
                      (item) => `<tr>
                    <td>${item.request_id}</td>
                    <td>${data.accounts.find((account) => account.id === item.account_id)?.name || item.account_id}</td>
                    <td>${item.requestor_role}</td>
                    <td>${item.topic}</td>
                    <td>${formatDate(item.due_date)}</td>
                    <td><span class="status-pill" data-status="watch">${item.status}</span></td>
                    <td><a href="#" data-open-account="${item.account_id}">Open account</a></td>
                  </tr>`
                    )
                    .join('')
                : '<tr><td colspan="7">No triage items waiting.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-intake]')?.addEventListener('click', () => navigate('intake'));
  wrapper.querySelector('[data-go-programs]')?.addEventListener('click', () => navigate('programs'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-safe-toggle]')?.addEventListener('change', (event) =>
    onToggleSafe(Boolean(event.target.checked))
  );

  wrapper.querySelectorAll('[data-open-account]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      navigate('account', { id: anchor.getAttribute('data-open-account') });
    });
  });

  wrapper.querySelectorAll('[data-copy-invite]').forEach((button) => {
    button.addEventListener('click', () => onCopyInvite(button.getAttribute('data-copy-invite')));
  });

  wrapper.querySelectorAll('[data-log-attendance]').forEach((button) => {
    button.addEventListener('click', () => onLogAttendance(button.getAttribute('data-log-attendance')));
  });

  const renderOutliers = () => {
    const filtered = portfolio.outliers.filter((item) => {
      const health = String(item.account.health?.overall || 'yellow').toLowerCase();
      if (state.outlierHealth !== 'all' && health !== state.outlierHealth) return false;
      if (state.outlierStaleOnly && Number(item.healthStaleDays || 0) <= 10) return false;
      return true;
    });

    const body = wrapper.querySelector('[data-outlier-body]');
    if (!body) return;
    body.innerHTML = filtered.length ? outlierRows(filtered) : '<tr><td colspan="6">No outliers for current filters.</td></tr>';

    const count = wrapper.querySelector('[data-outlier-count]');
    if (count) count.textContent = `${filtered.length} flagged`;

    wrapper.querySelectorAll('[data-open-account]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        navigate('account', { id: anchor.getAttribute('data-open-account') });
      });
    });
  };

  wrapper.querySelector('[data-outlier-health]')?.addEventListener('change', (event) => {
    state.outlierHealth = event.target.value;
    renderOutliers();
  });
  wrapper.querySelector('[data-outlier-stale]')?.addEventListener('change', (event) => {
    state.outlierStaleOnly = Boolean(event.target.checked);
    renderOutliers();
  });

  return wrapper;
};

export const portfolioCommandEntries = (data) => {
  const accountEntries = (data.accounts || []).map((account) => ({
    id: `account-${account.id}`,
    label: `Open account: ${account.name}`,
    meta: `${stageLabel(account.health?.lifecycle_stage)} | ${account.segment}`,
    action: { route: 'account', params: { id: account.id } }
  }));

  return [
    {
      id: 'go-intake',
      label: 'Create intake request',
      meta: 'Intake',
      action: { route: 'intake' }
    },
    {
      id: 'go-programs',
      label: 'Open programs',
      meta: 'Programs',
      action: { route: 'programs' }
    },
    {
      id: 'go-resources',
      label: 'Open resources',
      meta: 'Resources',
      action: { route: 'resources' }
    },
    ...accountEntries
  ];
};
