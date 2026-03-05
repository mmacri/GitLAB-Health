import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { formatDate } from '../lib/date.js';

const normalize = (value) => String(value || '').trim().toLowerCase();

const stageTone = (health) => {
  const value = normalize(health);
  if (value === 'green') return 'good';
  if (value === 'yellow') return 'warn';
  if (value === 'red') return 'risk';
  return 'neutral';
};

const renewalDays = (dateValue) => {
  if (!dateValue) return null;
  const target = new Date(dateValue).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.floor((target - Date.now()) / (1000 * 60 * 60 * 24));
};

const adoptionBand = (score) => {
  const value = Number(score || 0);
  if (value >= 75) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
};

const byId = (items = []) =>
  items.reduce((acc, item) => {
    if (item?.id) acc[item.id] = item;
    return acc;
  }, {});

const buildRows = (workspaceRows = []) =>
  workspaceRows.map((item) => ({
    id: item.customer.id,
    name: item.customer.name,
    tier: item.customer.tier,
    renewalDate: item.customer.renewalDate,
    renewalDays: item.renewalDays,
    health: item.health,
    adoptionScore: item.adoptionScore,
    engagementScore: item.engagementScore,
    riskScore: item.riskScore,
    lastEngagementDate: item.lastEngagementDate ? String(item.lastEngagementDate).slice(0, 10) : '',
    stage: item.customer.stage
  }));

const renderTableRows = (rows, selected) => {
  if (!rows.length) {
    return '<tr><td colspan="10">No customers match current filters.</td></tr>';
  }
  return rows
    .map(
      (row) => `
      <tr>
        <td><input type="checkbox" data-row-select="${row.id}" ${selected.has(row.id) ? 'checked' : ''} /></td>
        <td><a href="#" data-open-customer="${row.id}">${row.name}</a></td>
        <td>${row.tier}</td>
        <td>${row.stage}</td>
        <td>${statusChip({ label: row.health, tone: stageTone(row.health) })}</td>
        <td>${row.adoptionScore}</td>
        <td>${row.engagementScore}</td>
        <td>${row.riskScore}</td>
        <td>${row.renewalDays === null ? 'Not configured' : `${row.renewalDays}d`}</td>
        <td>${formatDate(row.lastEngagementDate)}</td>
      </tr>
    `
    )
    .join('');
};

export const renderCustomersPage = (ctx) => {
  const {
    workspace,
    portfolioRows,
    navigate,
    onCreateCustomer,
    onBulkAddToProgram,
    onBulkExport,
    onBulkLogEngagement,
    notify
  } = ctx;

  const rows = buildRows(portfolioRows || []);
  const programs = workspace?.programs || [];
  const customerMap = byId(workspace?.customers || []);
  const selected = new Set();
  const state = {
    tier: 'all',
    renewalWindow: 'all',
    health: 'all',
    adoptionBand: 'all',
    search: ''
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'customers');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Customers',
      title: 'Customer Directory',
      subtitle:
        'Manage customer records, filter by renewal and health, and run bulk actions for programs and engagement logging.',
      actionsHtml: `
        <button class="qa" type="button" data-create-customer>Add customer</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Open Portfolio</button>
      `
    })}

    <section class="card">
      <div class="filter-row">
        <label>
          Search
          <input type="search" data-filter-search placeholder="Search customer or stage..." />
        </label>
        <label>
          Tier
          <select data-filter-tier>
            <option value="all">All</option>
            <option value="premium">Premium</option>
            <option value="standard">Standard</option>
          </select>
        </label>
        <label>
          Health
          <select data-filter-health>
            <option value="all">All</option>
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
        </label>
        <label>
          Renewal window
          <select data-filter-renewal>
            <option value="all">All</option>
            <option value="90">0-90 days</option>
            <option value="180">91-180 days</option>
            <option value="181">180+ days</option>
          </select>
        </label>
        <label>
          Adoption band
          <select data-filter-adoption>
            <option value="all">All</option>
            <option value="high">High (75+)</option>
            <option value="medium">Medium (50-74)</option>
            <option value="low">Low (&lt;50)</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Bulk Actions</h2>
        ${statusChip({ label: `${rows.length} customers`, tone: 'neutral' })}
      </div>
      <div class="form-grid">
        <label>
          Program
          <select data-program-select>
            <option value="">Select program</option>
            ${programs.map((program) => `<option value="${program.id}">${program.name}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="page-actions" style="margin-top:12px;">
        <button class="ghost-btn" type="button" data-bulk-program>Add selected to program</button>
        <button class="ghost-btn" type="button" data-bulk-engagement>Log engagement for selected</button>
        <button class="ghost-btn" type="button" data-bulk-export>Export selected CSV</button>
      </div>
      <p class="muted" data-selected-status>0 selected</p>
    </section>

    <section class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" data-select-all /></th>
              <th>Customer</th>
              <th>Tier</th>
              <th>Lifecycle</th>
              <th>Health</th>
              <th>Adoption</th>
              <th>Engagement</th>
              <th>Risk</th>
              <th>Renewal</th>
              <th>Last engagement</th>
            </tr>
          </thead>
          <tbody data-customers-body></tbody>
        </table>
      </div>
    </section>
  `;

  const body = wrapper.querySelector('[data-customers-body]');
  const selectedStatus = wrapper.querySelector('[data-selected-status]');
  const selectAll = wrapper.querySelector('[data-select-all]');

  const filteredRows = () =>
    rows.filter((row) => {
      if (state.tier !== 'all' && normalize(row.tier) !== state.tier) return false;
      if (state.health !== 'all' && normalize(row.health) !== state.health) return false;
      if (state.adoptionBand !== 'all' && adoptionBand(row.adoptionScore) !== state.adoptionBand) return false;
      if (state.renewalWindow === '90' && !(Number(row.renewalDays ?? 999) <= 90)) return false;
      if (state.renewalWindow === '180' && !(Number(row.renewalDays ?? 999) > 90 && Number(row.renewalDays ?? 999) <= 180))
        return false;
      if (state.renewalWindow === '181' && !(Number(row.renewalDays ?? 999) > 180)) return false;
      if (state.search) {
        const hay = `${row.name} ${row.stage}`.toLowerCase();
        if (!hay.includes(state.search)) return false;
      }
      return true;
    });

  const syncSelectedStatus = () => {
    selectedStatus.textContent = `${selected.size} selected`;
    const visible = filteredRows().map((item) => item.id);
    const visibleSelected = visible.filter((id) => selected.has(id));
    selectAll.checked = visible.length > 0 && visibleSelected.length === visible.length;
  };

  const renderRows = () => {
    body.innerHTML = renderTableRows(filteredRows(), selected);
    syncSelectedStatus();
  };

  renderRows();

  wrapper.querySelector('[data-filter-search]')?.addEventListener('input', (event) => {
    state.search = String(event.target.value || '').trim().toLowerCase();
    renderRows();
  });
  wrapper.querySelector('[data-filter-tier]')?.addEventListener('change', (event) => {
    state.tier = String(event.target.value || 'all');
    renderRows();
  });
  wrapper.querySelector('[data-filter-health]')?.addEventListener('change', (event) => {
    state.health = String(event.target.value || 'all');
    renderRows();
  });
  wrapper.querySelector('[data-filter-renewal]')?.addEventListener('change', (event) => {
    state.renewalWindow = String(event.target.value || 'all');
    renderRows();
  });
  wrapper.querySelector('[data-filter-adoption]')?.addEventListener('change', (event) => {
    state.adoptionBand = String(event.target.value || 'all');
    renderRows();
  });

  wrapper.querySelector('[data-create-customer]')?.addEventListener('click', () => onCreateCustomer?.());
  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));

  selectAll?.addEventListener('change', () => {
    const visible = filteredRows().map((row) => row.id);
    if (selectAll.checked) {
      visible.forEach((id) => selected.add(id));
    } else {
      visible.forEach((id) => selected.delete(id));
    }
    renderRows();
  });

  wrapper.querySelector('[data-bulk-program]')?.addEventListener('click', () => {
    const programId = String(wrapper.querySelector('[data-program-select]')?.value || '').trim();
    if (!programId) {
      notify?.('Select a program first.');
      return;
    }
    if (!selected.size) {
      notify?.('Select at least one customer.');
      return;
    }
    onBulkAddToProgram?.([...selected], programId);
  });

  wrapper.querySelector('[data-bulk-engagement]')?.addEventListener('click', () => {
    if (!selected.size) {
      notify?.('Select at least one customer.');
      return;
    }
    onBulkLogEngagement?.([...selected]);
  });

  wrapper.querySelector('[data-bulk-export]')?.addEventListener('click', () => {
    if (!selected.size) {
      notify?.('Select at least one customer.');
      return;
    }
    const rowsForExport = [...selected]
      .map((id) => rows.find((item) => item.id === id))
      .filter(Boolean)
      .map((row) => ({
        customerId: row.id,
        name: row.name,
        tier: row.tier,
        stage: row.stage,
        renewalDate: customerMap[row.id]?.renewalDate || '',
        health: row.health,
        adoptionScore: row.adoptionScore,
        engagementScore: row.engagementScore,
        riskScore: row.riskScore
      }));
    onBulkExport?.(rowsForExport);
  });

  wrapper.addEventListener('click', (event) => {
    const openLink = event.target.closest('[data-open-customer]');
    if (openLink) {
      event.preventDefault();
      const customerId = openLink.getAttribute('data-open-customer');
      navigate('customer', { id: customerId });
      return;
    }
    const rowSelect = event.target.closest('[data-row-select]');
    if (rowSelect) {
      const rowId = rowSelect.getAttribute('data-row-select');
      if (rowSelect.checked) selected.add(rowId);
      else selected.delete(rowId);
      syncSelectedStatus();
    }
  });

  return wrapper;
};

export const customersCommandEntries = (workspace) =>
  (workspace?.customers || []).map((customer) => ({
    id: `customer-${customer.id}`,
    label: `Open customer: ${customer.name}`,
    meta: customer.stage,
    action: { route: 'customer', params: { id: customer.id } }
  }));
