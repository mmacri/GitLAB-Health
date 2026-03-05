import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { formatDate } from '../lib/date.js';

const statuses = ['all', 'Captured', 'In Review', 'Planned', 'Shipped', 'Closed'];

const normalize = (value) => String(value || '').trim().toLowerCase();

export const renderVocPage = (ctx) => {
  const { workspace, navigate, onAddVoc, onExportVocCsv, notify } = ctx;
  const rows = workspace?.voc || [];
  const customers = workspace?.customers || [];
  const customerName = rows.reduce((acc, item) => {
    const customer = customers.find((entry) => entry.id === item.customerId);
    if (customer) acc[item.customerId] = customer.name;
    return acc;
  }, {});
  const areas = ['all', ...new Set(rows.map((item) => item.area).filter(Boolean))];
  const state = { search: '', area: 'all', status: 'all' };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'voc');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Voice of Customer',
      title: 'VOC Capture',
      subtitle: 'Capture and track customer feedback linked to adoption areas and product usage outcomes.',
      actionsHtml: `<button class="ghost-btn" type="button" data-export-voc>Export VOC CSV</button>`
    })}

    <section class="card">
      <div class="filter-row">
        <label>
          Search
          <input type="search" data-filter-search placeholder="Search request or impact..." />
        </label>
        <label>
          Area
          <select data-filter-area>
            ${areas.map((area) => `<option value="${area}">${area === 'all' ? 'All' : area}</option>`).join('')}
          </select>
        </label>
        <label>
          Status
          <select data-filter-status>
            ${statuses.map((status) => `<option value="${status}">${status === 'all' ? 'All' : status}</option>`).join('')}
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>VOC Registry</h2>
        ${statusChip({ label: `${rows.length} entries`, tone: 'neutral' })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Area</th>
              <th>Request</th>
              <th>Impact</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody data-voc-rows></tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Add VOC Entry</h2>
      </div>
      <form class="form-grid" data-add-voc>
        <label>
          Customer
          <select name="customerId">
            ${customers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`).join('')}
          </select>
        </label>
        <label>
          Area
          <input name="area" required />
        </label>
        <label>
          Status
          <select name="status">
            ${statuses.filter((item) => item !== 'all').map((status) => `<option>${status}</option>`).join('')}
          </select>
        </label>
        <label class="form-span">
          Request
          <textarea name="request" rows="2" required></textarea>
        </label>
        <label class="form-span">
          Impact
          <textarea name="impact" rows="2" required></textarea>
        </label>
        <div class="form-span page-actions">
          <button class="ghost-btn" type="submit">Capture VOC</button>
        </div>
      </form>
    </section>
  `;

  const tbody = wrapper.querySelector('[data-voc-rows]');
  const filtered = () =>
    rows.filter((item) => {
      if (state.area !== 'all' && normalize(item.area) !== normalize(state.area)) return false;
      if (state.status !== 'all' && normalize(item.status) !== normalize(state.status)) return false;
      if (state.search) {
        const hay = `${item.request} ${item.impact} ${customerName[item.customerId] || ''}`.toLowerCase();
        if (!hay.includes(state.search)) return false;
      }
      return true;
    });

  const renderRows = () => {
    const matches = filtered();
    tbody.innerHTML = matches.length
      ? matches
          .map(
            (item) => `
            <tr>
              <td><a href="#" data-open-customer="${item.customerId}">${customerName[item.customerId] || item.customerId}</a></td>
              <td>${item.area}</td>
              <td>${item.request}</td>
              <td>${item.impact}</td>
              <td>${formatDate(item.createdAt)}</td>
              <td>${item.status}</td>
            </tr>
          `
          )
          .join('')
      : '<tr><td colspan="6">No entries match current filters.</td></tr>';
  };

  renderRows();

  wrapper.querySelector('[data-filter-search]')?.addEventListener('input', (event) => {
    state.search = String(event.target.value || '').trim().toLowerCase();
    renderRows();
  });
  wrapper.querySelector('[data-filter-area]')?.addEventListener('change', (event) => {
    state.area = String(event.target.value || 'all');
    renderRows();
  });
  wrapper.querySelector('[data-filter-status]')?.addEventListener('change', (event) => {
    state.status = String(event.target.value || 'all');
    renderRows();
  });

  wrapper.querySelector('[data-export-voc]')?.addEventListener('click', () => onExportVocCsv?.());

  wrapper.querySelector('[data-add-voc]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      customerId: String(form.get('customerId') || '').trim(),
      area: String(form.get('area') || '').trim(),
      status: String(form.get('status') || 'Captured').trim(),
      request: String(form.get('request') || '').trim(),
      impact: String(form.get('impact') || '').trim()
    };
    if (!payload.customerId || !payload.area || !payload.request || !payload.impact) {
      notify?.('Complete all VOC fields.');
      return;
    }
    onAddVoc?.(payload);
  });

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (!link) return;
    event.preventDefault();
    navigate('customer', { id: link.getAttribute('data-open-customer') });
  });

  return wrapper;
};
