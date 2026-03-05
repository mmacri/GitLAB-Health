import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';

const BOARD_COLUMNS = ['Open', 'Validating', 'Proposed', 'Won', 'Closed'];

const normalize = (value) => String(value || '').trim().toLowerCase();

const collectRows = (workspace) => {
  const customers = workspace?.customers || [];
  return customers.flatMap((customer) =>
    (workspace?.expansion?.[customer.id] || []).map((item) => ({
      ...item,
      customerId: customer.id,
      customerName: customer.name
    }))
  );
};

export const renderExpansionPage = (ctx) => {
  const { workspace, navigate, onSetExpansionStatus, onAddExpansion, notify } = ctx;
  const rows = collectRows(workspace);
  const customers = workspace?.customers || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'expansion');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Expansion',
      title: 'Expansion Opportunity Pipeline',
      subtitle:
        'Track use-case expansion and growth motions from open discovery through validation and closed outcomes.'
    })}

    <section class="grid-cards">
      ${BOARD_COLUMNS.map((column) => {
        const items = rows.filter((row) => normalize(row.status) === normalize(column));
        return `
          <article class="card compact-card">
            <div class="metric-head">
              <h2>${column}</h2>
              ${statusChip({ label: `${items.length}`, tone: column === 'Won' ? 'good' : column === 'Open' ? 'warn' : 'neutral' })}
            </div>
            <ul class="simple-list">
              ${
                items.length
                  ? items
                      .map(
                        (item) => `
                      <li>
                        <strong>${item.title}</strong>
                        <p class="muted"><a href="#" data-open-customer="${item.customerId}">${item.customerName}</a> • ${item.type}</p>
                        <p class="muted">${item.rationale || ''}</p>
                        <p class="muted">Impact: ${item.estImpact || ''}</p>
                        <label>
                          Status
                          <select data-expansion-status="${item.customerId}:${item.id}">
                            ${BOARD_COLUMNS.map((status) => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}
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
      }).join('')}
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Add Expansion Opportunity</h2>
        ${statusChip({ label: `${rows.length} total`, tone: 'neutral' })}
      </div>
      <form class="form-grid" data-add-expansion>
        <label>
          Customer
          <select name="customerId">
            ${customers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`).join('')}
          </select>
        </label>
        <label>
          Type
          <input name="type" value="UseCaseAdd" />
        </label>
        <label class="form-span">
          Title
          <input name="title" required />
        </label>
        <label class="form-span">
          Rationale
          <textarea name="rationale" rows="2" required></textarea>
        </label>
        <label class="form-span">
          Estimated impact
          <textarea name="estImpact" rows="2" required></textarea>
        </label>
        <label>
          Status
          <select name="status">
            ${BOARD_COLUMNS.map((status) => `<option>${status}</option>`).join('')}
          </select>
        </label>
        <div class="form-span page-actions">
          <button class="ghost-btn" type="submit">Add opportunity</button>
        </div>
      </form>
    </section>
  `;

  wrapper.querySelectorAll('[data-expansion-status]').forEach((select) => {
    select.addEventListener('change', () => {
      const [customerId, opportunityId] = String(select.getAttribute('data-expansion-status') || '').split(':');
      if (!customerId || !opportunityId) return;
      onSetExpansionStatus?.(customerId, opportunityId, String(select.value || 'Open'));
    });
  });

  wrapper.querySelector('[data-add-expansion]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerId = String(form.get('customerId') || '').trim();
    if (!customerId) {
      notify?.('Select a customer.');
      return;
    }
    onAddExpansion?.(customerId, {
      type: String(form.get('type') || 'UseCaseAdd').trim(),
      title: String(form.get('title') || '').trim(),
      rationale: String(form.get('rationale') || '').trim(),
      estImpact: String(form.get('estImpact') || '').trim(),
      status: String(form.get('status') || 'Open').trim()
    });
  });

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (!link) return;
    event.preventDefault();
    navigate('customer', { id: link.getAttribute('data-open-customer') });
  });

  return wrapper;
};
